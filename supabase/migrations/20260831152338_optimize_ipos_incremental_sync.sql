begin;

-- Return only sale headers whose authoritative iPOS version is not already
-- stored.  The complete set of headers is still used by absent-sale
-- reconciliation, while unchanged receipts no longer require detail requests.
create or replace function public.ly_ipos_changed_sale_ids(
  p_org_id uuid,
  p_sales jsonb
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with incoming as (
    select
      nullif(trim(x.value->>'tran_id'),'') as raw_tran_id,
      coalesce(
        substring(nullif(trim(x.value->>'tran_id'),'') from '^EDT_(.+)_[0-9]+$'),
        nullif(trim(x.value->>'tran_id'),'')
      ) as canonical_tran_id,
      nullif(x.value->>'sale_updated_at','')::bigint as sale_updated_at
    from jsonb_array_elements(
      case when jsonb_typeof(coalesce(p_sales,'[]'::jsonb))='array'
        then coalesce(p_sales,'[]'::jsonb)
        else '[]'::jsonb
      end
    ) x
  ), changed as (
    select i.raw_tran_id
    from incoming i
    left join public.ly_sales s
      on s.org_id=p_org_id
     and s.source='iPOS'
     and s.ipos_tran_id=i.canonical_tran_id
    where i.raw_tran_id is not null
      and (
        s.id is null
        or i.sale_updated_at is null
        or s.ipos_sale_updated_at is null
        or s.ipos_sale_updated_at<>i.sale_updated_at
      )
  )
  select coalesce(jsonb_agg(raw_tran_id order by raw_tran_id),'[]'::jsonb)
  from changed;
$$;

-- Saving the receipt and rebuilding its inventory now share one database
-- transaction.  A failed inventory rebuild therefore cannot leave a receipt
-- marked current while its stock movements are stale.
create or replace function public.ly_ipos_upsert_sale_with_inventory(
  p_org_id uuid,
  p_warehouse_id uuid,
  p_sale jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale jsonb;
  v_inventory jsonb;
begin
  v_sale := public.ly_ipos_upsert_sale(p_org_id,p_warehouse_id,p_sale);

  if coalesce((v_sale->>'stale_ignored')::boolean,false) then
    return v_sale || jsonb_build_object(
      'inventory_skipped',true,
      'inventory_changed',false
    );
  end if;

  v_inventory := public.ly_ipos_apply_sale_inventory(
    p_org_id,
    (v_sale->>'sale_id')::uuid
  );

  return v_sale || v_inventory || jsonb_build_object('inventory_skipped',false);
end;
$$;

revoke all on function public.ly_ipos_changed_sale_ids(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.ly_ipos_upsert_sale_with_inventory(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.ly_ipos_changed_sale_ids(uuid,jsonb) to postgres,service_role;
grant execute on function public.ly_ipos_upsert_sale_with_inventory(uuid,uuid,jsonb) to postgres,service_role;

commit;
