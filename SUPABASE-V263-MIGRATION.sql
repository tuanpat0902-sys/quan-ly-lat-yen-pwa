-- ============================================================
-- V263 AUTH-FIRST CUTOVER + TRANSACTIONAL CLOUD RESET
-- Pairing/Canonical is no longer required by the V263 app.
-- Keep legacy RPCs temporarily only for rollback compatibility.
-- ============================================================

create or replace function public.reset_my_organization_v263()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_role text;
  v_total bigint := 0;
  v_n bigint := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select om.organization_id,om.role
    into v_org,v_role
  from public.organization_members om
  where om.user_id=v_uid
  order by om.created_at
  limit 1;

  if v_org is null then
    raise exception 'No organization';
  end if;

  if v_role not in ('owner','admin') then
    raise exception 'Owner/Admin required';
  end if;

  -- One server transaction. Any error rolls back the whole function.
  delete from public.stock_transactions where organization_id=v_org;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  delete from public.sale_items where organization_id=v_org;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  delete from public.sales where organization_id=v_org;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  delete from public.recipe_items where organization_id=v_org;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  delete from public.prepared_ingredient_items where organization_id=v_org;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  delete from public.inventory where organization_id=v_org;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  delete from public.products where organization_id=v_org;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  delete from public.ingredients where organization_id=v_org;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  delete from public.suppliers where organization_id=v_org;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  delete from public.warehouses where organization_id=v_org;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  return jsonb_build_object(
    'ok',true,
    'organization_id',v_org,
    'deleted_records',v_total,
    'deleted_at',now()
  );
end;
$$;

grant execute on function public.reset_my_organization_v263() to authenticated;
revoke all on function public.reset_my_organization_v263() from anon;
