-- Treat iPOS EDT_<root>_<revision> transaction ids as revisions of the same sale.
-- Keep only the newest revision by ipos_sale_updated_at and prevent stale base
-- payloads from overwriting a newer edited payload.

begin;

-- Normalize existing edited-sale rows. If a canonical/root row already exists,
-- keep the newer of the two rows. Deleting the stale sale cascades only to its
-- sale items; no other table references ly_sales directly.
do $$
declare
  e record;
  v_root text;
  b record;
begin
  for e in
    select s.*
    from public.ly_sales s
    where s.ipos_tran_id ~ '^EDT_.+_[0-9]+$'
    order by s.org_id, s.ipos_sale_updated_at nulls first, s.created_at
  loop
    v_root := substring(e.ipos_tran_id from '^EDT_(.+)_[0-9]+$');
    if v_root is null then
      continue;
    end if;

    select s.id, s.ipos_sale_updated_at
      into b
    from public.ly_sales s
    where s.org_id = e.org_id
      and s.ipos_tran_id = v_root
      and s.id <> e.id
    limit 1;

    if b.id is null then
      update public.ly_sales
      set ipos_tran_id = v_root,
          updated_at = now()
      where id = e.id;
    elsif coalesce(e.ipos_sale_updated_at, -1) >= coalesce(b.ipos_sale_updated_at, -1) then
      delete from public.ly_sales where id = b.id;
      update public.ly_sales
      set ipos_tran_id = v_root,
          updated_at = now()
      where id = e.id;
    else
      delete from public.ly_sales where id = e.id;
    end if;
  end loop;
end;
$$;

create or replace function public.ly_ipos_upsert_sale(
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
  v_sale_id uuid;
  v_raw_tran_id text := nullif(trim(p_sale->>'tran_id'),'');
  v_tran_id text;
  v_tran_no text := nullif(trim(p_sale->>'tran_no'),'');
  v_store_uid text := nullif(trim(p_sale->>'store_uid'),'');
  v_detail jsonb;
  v_product_id uuid;
  v_detail_id text;
  v_item_count int := 0;
  v_unconfigured_recipe_count int := 0;
  v_sold_at timestamptz;
  v_incoming_updated bigint := nullif(p_sale->>'sale_updated_at','')::bigint;
  v_existing_updated bigint;
begin
  if p_org_id is null or p_warehouse_id is null then
    raise exception 'org_id and warehouse_id are required';
  end if;
  if v_raw_tran_id is null or v_tran_no is null then
    raise exception 'iPOS tran_id and tran_no are required';
  end if;

  -- iPOS uses EDT_<root>_<revision> for an edited version of an existing sale.
  -- Persist the root transaction id as the stable identity for all revisions.
  v_tran_id := coalesce(
    substring(v_raw_tran_id from '^EDT_(.+)_[0-9]+$'),
    v_raw_tran_id
  );

  if not exists (
    select 1
    from public.ly_warehouses w
    where w.id=p_warehouse_id and w.org_id=p_org_id and w.active
  ) then
    raise exception 'Warehouse does not belong to organization or is inactive';
  end if;

  v_sold_at := case
    when nullif(p_sale->>'tran_date','') is not null
      then to_timestamp((p_sale->>'tran_date')::numeric / 1000.0)
    else now()
  end;

  select s.id, s.ipos_sale_updated_at
    into v_sale_id, v_existing_updated
  from public.ly_sales s
  where s.org_id=p_org_id and s.ipos_tran_id=v_tran_id
  limit 1;

  -- Ignore a stale payload if a newer revision of the same iPOS sale is already
  -- stored. This protects an EDT revision from being overwritten by a later
  -- re-fetch of the older base transaction.
  if v_sale_id is not null
     and v_existing_updated is not null
     and v_incoming_updated is not null
     and v_incoming_updated < v_existing_updated then
    return jsonb_build_object(
      'sale_id', v_sale_id,
      'ipos_tran_id', v_tran_id,
      'raw_ipos_tran_id', v_raw_tran_id,
      'stale_ignored', true,
      'items', 0,
      'items_without_recipe', 0,
      'inventory_changed', false
    );
  end if;

  if v_sale_id is null then
    insert into public.ly_sales(
      org_id, warehouse_id, receipt_no, sold_at, source, note,
      subtotal, discount_type, discount_value, receipt_discount,
      item_discount_total, discount, total_amount,
      ipos_tran_id, ipos_store_uid, ipos_sale_updated_at,
      ipos_payment_methods, ipos_last_synced_at
    ) values (
      p_org_id, p_warehouse_id, v_tran_no, v_sold_at, 'iPOS', coalesce(p_sale->>'sale_note',''),
      coalesce((p_sale->>'amount_origin')::numeric,0), 'amount',
      coalesce((p_sale->>'discount_extra_amount')::numeric,0),
      coalesce((p_sale->>'discount_extra_amount')::numeric,0),
      coalesce((p_sale->>'amount_discount_detail')::numeric,0),
      coalesce((p_sale->>'discount_extra_amount')::numeric,0)+coalesce((p_sale->>'amount_discount_detail')::numeric,0),
      coalesce((p_sale->>'total_amount')::numeric,0),
      v_tran_id, v_store_uid, v_incoming_updated,
      coalesce(p_sale->'sale_payment_method','[]'::jsonb), now()
    ) returning id into v_sale_id;
  else
    update public.ly_sales set
      warehouse_id=p_warehouse_id,
      receipt_no=v_tran_no,
      sold_at=v_sold_at,
      source='iPOS',
      note=coalesce(p_sale->>'sale_note',''),
      subtotal=coalesce((p_sale->>'amount_origin')::numeric,0),
      discount_type='amount',
      discount_value=coalesce((p_sale->>'discount_extra_amount')::numeric,0),
      receipt_discount=coalesce((p_sale->>'discount_extra_amount')::numeric,0),
      item_discount_total=coalesce((p_sale->>'amount_discount_detail')::numeric,0),
      discount=coalesce((p_sale->>'discount_extra_amount')::numeric,0)+coalesce((p_sale->>'amount_discount_detail')::numeric,0),
      total_amount=coalesce((p_sale->>'total_amount')::numeric,0),
      ipos_store_uid=v_store_uid,
      ipos_sale_updated_at=v_incoming_updated,
      ipos_payment_methods=coalesce(p_sale->'sale_payment_method','[]'::jsonb),
      ipos_last_synced_at=now(),
      updated_at=now()
    where id=v_sale_id;

    delete from public.ly_sale_items where org_id=p_org_id and sale_id=v_sale_id;
  end if;

  for v_detail in
    select value from jsonb_array_elements(coalesce(p_sale->'sale_detail','[]'::jsonb))
  loop
    v_detail_id := coalesce(nullif(v_detail->>'id_sale_detail',''), nullif(v_detail->>'id',''));
    v_product_id := public.ly_ipos_upsert_product(p_org_id,p_warehouse_id,v_detail);

    insert into public.ly_sale_items(
      org_id, sale_id, product_id, quantity, unit_price,
      line_subtotal, item_discount_type, item_discount_value,
      item_discount, line_total,
      ipos_sale_detail_id, ipos_item_id, ipos_toppings
    ) values (
      p_org_id, v_sale_id, v_product_id,
      coalesce((v_detail->>'quantity')::numeric,0),
      coalesce((v_detail->>'price')::numeric,0),
      coalesce((v_detail->>'price_org')::numeric,0) * coalesce((v_detail->>'quantity')::numeric,0),
      'amount', coalesce((v_detail->>'discount_amount')::numeric,0),
      coalesce((v_detail->>'discount_amount')::numeric,0),
      coalesce((v_detail->>'amount')::numeric,0),
      v_detail_id, nullif(v_detail->>'item_id',''), coalesce(v_detail->'toppings','[]'::jsonb)
    );

    v_item_count := v_item_count + 1;
    if not exists (
      select 1 from public.ly_recipe_items r
      where r.org_id=p_org_id and r.product_id=v_product_id
    ) then
      v_unconfigured_recipe_count := v_unconfigured_recipe_count + 1;
    end if;
  end loop;

  insert into public.ly_ipos_sync_state(
    org_id,store_uid,last_success_at,last_attempt_at,last_error,
    last_sale_updated_at,last_tran_id,updated_at
  ) values(
    p_org_id,coalesce(v_store_uid,'unknown'),now(),now(),null,
    v_incoming_updated,v_raw_tran_id,now()
  )
  on conflict(org_id,store_uid) do update set
    last_success_at=excluded.last_success_at,
    last_attempt_at=excluded.last_attempt_at,
    last_error=null,
    last_sale_updated_at=excluded.last_sale_updated_at,
    last_tran_id=excluded.last_tran_id,
    updated_at=now();

  return jsonb_build_object(
    'sale_id',v_sale_id,
    'ipos_tran_id',v_tran_id,
    'raw_ipos_tran_id',v_raw_tran_id,
    'stale_ignored',false,
    'items',v_item_count,
    'items_without_recipe',v_unconfigured_recipe_count,
    'inventory_changed',false
  );
end;
$$;

revoke all on function public.ly_ipos_upsert_sale(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.ly_ipos_upsert_sale(uuid,uuid,jsonb) to postgres, service_role;

commit;
