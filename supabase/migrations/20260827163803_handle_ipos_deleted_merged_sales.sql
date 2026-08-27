create or replace function public.ly_ipos_delete_sale(
  p_org_id uuid,
  p_raw_tran_id text,
  p_sale_updated_at bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_raw_tran_id text := nullif(trim(p_raw_tran_id),'');
  v_tran_id text;
  v_sale_id uuid;
  v_existing_updated bigint;
  v_total numeric;
begin
  if p_org_id is null then
    raise exception 'org_id is required';
  end if;
  if v_raw_tran_id is null then
    raise exception 'iPOS tran_id is required';
  end if;

  v_tran_id := coalesce(
    substring(v_raw_tran_id from '^EDT_(.+)_[0-9]+$'),
    v_raw_tran_id
  );

  select s.id, s.ipos_sale_updated_at, s.total_amount
    into v_sale_id, v_existing_updated, v_total
  from public.ly_sales s
  where s.org_id = p_org_id
    and s.ipos_tran_id = v_tran_id
  limit 1;

  if v_sale_id is null then
    return jsonb_build_object(
      'deleted', false,
      'sale_id', null,
      'ipos_tran_id', v_tran_id,
      'raw_ipos_tran_id', v_raw_tran_id,
      'not_found', true,
      'stale_ignored', false,
      'inventory_changed', false
    );
  end if;

  if p_sale_updated_at is not null
     and v_existing_updated is not null
     and p_sale_updated_at < v_existing_updated then
    return jsonb_build_object(
      'deleted', false,
      'sale_id', v_sale_id,
      'ipos_tran_id', v_tran_id,
      'raw_ipos_tran_id', v_raw_tran_id,
      'not_found', false,
      'stale_ignored', true,
      'inventory_changed', false
    );
  end if;

  delete from public.ly_sales
  where id = v_sale_id;

  return jsonb_build_object(
    'deleted', true,
    'sale_id', v_sale_id,
    'ipos_tran_id', v_tran_id,
    'raw_ipos_tran_id', v_raw_tran_id,
    'total_amount', v_total,
    'not_found', false,
    'stale_ignored', false,
    'inventory_changed', false
  );
end;
$function$;

revoke all on function public.ly_ipos_delete_sale(uuid,text,bigint) from public, anon, authenticated;
grant execute on function public.ly_ipos_delete_sale(uuid,text,bigint) to service_role;
