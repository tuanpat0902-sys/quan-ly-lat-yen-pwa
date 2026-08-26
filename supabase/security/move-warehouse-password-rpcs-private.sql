-- Move privileged warehouse-password logic out of the exposed public schema.
-- Public RPC names/signatures remain unchanged as SECURITY INVOKER wrappers.

begin;

create or replace function ly_private.ly_warehouse_password_status_impl(p_warehouse_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := ly_private.ly_current_org();
  v_has_password boolean;
begin
  if v_org is null or not ly_private.ly_is_admin() then
    raise exception using message = 'Không có quyền quản lý kho.', errcode = '42501';
  end if;

  if not exists (
    select 1 from public.ly_warehouses
    where id = p_warehouse_id and org_id = v_org
  ) then
    raise exception using message = 'Không tìm thấy kho.', errcode = 'P0002';
  end if;

  select exists (
    select 1 from ly_private.ly_warehouse_passwords
    where warehouse_id = p_warehouse_id and org_id = v_org
  ) into v_has_password;

  return jsonb_build_object('warehouse_id', p_warehouse_id, 'has_password', v_has_password);
end;
$$;

create or replace function ly_private.ly_save_warehouse_secure_impl(
  p_warehouse jsonb,
  p_password_mode text,
  p_current_password text,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := ly_private.ly_current_org();
  v_input_id text := nullif(trim(p_warehouse->>'id'), '');
  v_id uuid := coalesce(v_input_id::uuid, extensions.gen_random_uuid());
  v_name text := trim(coalesce(p_warehouse->>'name', ''));
  v_address text := trim(coalesce(p_warehouse->>'address', ''));
  v_mode text := lower(trim(coalesce(p_password_mode, 'keep')));
  v_hash text;
  v_exists boolean;
begin
  if v_org is null or not ly_private.ly_is_admin() then
    raise exception using message = 'Không có quyền quản lý kho.', errcode = '42501';
  end if;

  if v_name = '' then
    raise exception using message = 'Nhập tên kho.', errcode = '22023';
  end if;

  if v_mode not in ('keep', 'set', 'remove') then
    raise exception using message = 'Chế độ mật khẩu không hợp lệ.', errcode = '22023';
  end if;

  select exists (
    select 1 from public.ly_warehouses where id = v_id and org_id = v_org
  ) into v_exists;

  if v_input_id is not null and not v_exists then
    raise exception using message = 'Không tìm thấy kho cần sửa.', errcode = 'P0002';
  end if;

  select password_hash into v_hash
  from ly_private.ly_warehouse_passwords
  where warehouse_id = v_id and org_id = v_org
  for update;

  if v_mode in ('set', 'remove') and v_hash is not null then
    if coalesce(p_current_password, '') = ''
       or extensions.crypt(p_current_password, v_hash) <> v_hash then
      raise exception using message = 'Mật khẩu hiện tại không đúng.', errcode = 'P0001';
    end if;
  end if;

  if v_mode = 'set' then
    if length(coalesce(p_new_password, '')) < 4
       or length(coalesce(p_new_password, '')) > 64 then
      raise exception using message = 'Mật khẩu kho phải có từ 4 đến 64 ký tự.', errcode = '22023';
    end if;
  end if;

  insert into public.ly_warehouses(id, org_id, name, address, active)
  values (v_id, v_org, v_name, v_address, coalesce((p_warehouse->>'active')::boolean, true))
  on conflict (id) do update set
    name = excluded.name,
    address = excluded.address,
    active = excluded.active,
    updated_at = now()
  where public.ly_warehouses.org_id = v_org;

  if v_mode = 'set' then
    insert into ly_private.ly_warehouse_passwords(warehouse_id, org_id, password_hash, updated_at)
    values (
      v_id,
      v_org,
      extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
      now()
    )
    on conflict (warehouse_id) do update set
      password_hash = excluded.password_hash,
      org_id = excluded.org_id,
      updated_at = now();
  elsif v_mode = 'remove' then
    delete from ly_private.ly_warehouse_passwords
    where warehouse_id = v_id and org_id = v_org;
  end if;

  return jsonb_build_object(
    'id', v_id,
    'org_id', v_org,
    'name', v_name,
    'address', v_address,
    'active', true,
    'has_password', exists (
      select 1 from ly_private.ly_warehouse_passwords
      where warehouse_id = v_id and org_id = v_org
    )
  );
end;
$$;

create or replace function ly_private.ly_delete_warehouse_secure_impl(
  p_warehouse_id uuid,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := ly_private.ly_current_org();
  v_name text;
  v_hash text;
  v_imports integer;
  v_exports integer;
  v_stocktakes integer;
  v_sales integer;
  v_cashflow integer;
begin
  if v_org is null or not ly_private.ly_is_admin() then
    raise exception using message = 'Không có quyền quản lý kho.', errcode = '42501';
  end if;

  select name into v_name
  from public.ly_warehouses
  where id = p_warehouse_id and org_id = v_org
  for update;

  if v_name is null then
    raise exception using message = 'Không tìm thấy kho.', errcode = 'P0002';
  end if;

  if (select count(*) from public.ly_warehouses where org_id = v_org) <= 1 then
    raise exception using message = 'Không thể xóa kho cuối cùng.', errcode = 'P0001';
  end if;

  select password_hash into v_hash
  from ly_private.ly_warehouse_passwords
  where warehouse_id = p_warehouse_id and org_id = v_org
  for update;

  if v_hash is not null then
    if coalesce(p_password, '') = ''
       or extensions.crypt(p_password, v_hash) <> v_hash then
      raise exception using message = 'Mật khẩu kho không đúng.', errcode = 'P0001';
    end if;
  end if;

  select count(*) into v_imports from public.ly_import_receipts where warehouse_id = p_warehouse_id and org_id = v_org;
  select count(*) into v_exports from public.ly_export_receipts where warehouse_id = p_warehouse_id and org_id = v_org;
  select count(*) into v_stocktakes from public.ly_stocktake_receipts where warehouse_id = p_warehouse_id and org_id = v_org;
  select count(*) into v_sales from public.ly_sales where warehouse_id = p_warehouse_id and org_id = v_org;
  select count(*) into v_cashflow from public.ly_cashflow_entries where warehouse_id = p_warehouse_id and org_id = v_org;

  delete from public.ly_import_receipts where warehouse_id = p_warehouse_id and org_id = v_org;
  delete from public.ly_export_receipts where warehouse_id = p_warehouse_id and org_id = v_org;
  delete from public.ly_stocktake_receipts where warehouse_id = p_warehouse_id and org_id = v_org;
  delete from public.ly_sales where warehouse_id = p_warehouse_id and org_id = v_org;
  delete from public.ly_warehouses where id = p_warehouse_id and org_id = v_org;

  return jsonb_build_object(
    'id', p_warehouse_id,
    'name', v_name,
    'deleted', true,
    'imports', v_imports,
    'exports', v_exports,
    'stocktakes', v_stocktakes,
    'sales', v_sales,
    'cashflow', v_cashflow
  );
end;
$$;

revoke all on function ly_private.ly_warehouse_password_status_impl(uuid) from public, anon;
revoke all on function ly_private.ly_save_warehouse_secure_impl(jsonb,text,text,text) from public, anon;
revoke all on function ly_private.ly_delete_warehouse_secure_impl(uuid,text) from public, anon;
grant execute on function ly_private.ly_warehouse_password_status_impl(uuid) to authenticated, service_role;
grant execute on function ly_private.ly_save_warehouse_secure_impl(jsonb,text,text,text) to authenticated, service_role;
grant execute on function ly_private.ly_delete_warehouse_secure_impl(uuid,text) to authenticated, service_role;

create or replace function public.ly_warehouse_password_status(p_warehouse_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select ly_private.ly_warehouse_password_status_impl(p_warehouse_id);
$$;

create or replace function public.ly_save_warehouse_secure(
  p_warehouse jsonb,
  p_password_mode text default 'keep'::text,
  p_current_password text default null::text,
  p_new_password text default null::text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select ly_private.ly_save_warehouse_secure_impl(p_warehouse,p_password_mode,p_current_password,p_new_password);
$$;

create or replace function public.ly_delete_warehouse_secure(
  p_warehouse_id uuid,
  p_password text default null::text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select ly_private.ly_delete_warehouse_secure_impl(p_warehouse_id,p_password);
$$;

revoke all on function public.ly_warehouse_password_status(uuid) from public, anon;
revoke all on function public.ly_save_warehouse_secure(jsonb,text,text,text) from public, anon;
revoke all on function public.ly_delete_warehouse_secure(uuid,text) from public, anon;
grant execute on function public.ly_warehouse_password_status(uuid) to authenticated, service_role;
grant execute on function public.ly_save_warehouse_secure(jsonb,text,text,text) to authenticated, service_role;
grant execute on function public.ly_delete_warehouse_secure(uuid,text) to authenticated, service_role;

commit;
