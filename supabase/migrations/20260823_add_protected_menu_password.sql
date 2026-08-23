create table if not exists ly_private.ly_menu_security (
  org_id uuid primary key references public.ly_organizations(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

revoke all on table ly_private.ly_menu_security from public, anon, authenticated;

create or replace function public.ly_menu_password_status()
returns table(enabled boolean, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, auth, ly_private, extensions, pg_temp
as $$
declare
  v_org uuid;
begin
  v_org := ly_private.ly_current_org();
  if auth.uid() is null or v_org is null then
    raise exception 'Not authorized';
  end if;
  return query
  select true, s.updated_at
  from ly_private.ly_menu_security s
  where s.org_id = v_org
  union all
  select false, null::timestamptz
  where not exists (select 1 from ly_private.ly_menu_security s where s.org_id = v_org)
  limit 1;
end;
$$;

create or replace function public.ly_verify_menu_password(p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, auth, ly_private, extensions, pg_temp
as $$
declare
  v_org uuid;
  v_hash text;
begin
  v_org := ly_private.ly_current_org();
  if auth.uid() is null or v_org is null then
    return false;
  end if;
  select s.password_hash into v_hash
  from ly_private.ly_menu_security s
  where s.org_id = v_org;
  if v_hash is null then
    return true;
  end if;
  return extensions.crypt(coalesce(p_password,''), v_hash) = v_hash;
end;
$$;

create or replace function public.ly_set_menu_password(p_new_password text, p_current_password text default null)
returns boolean
language plpgsql
security definer
set search_path = public, auth, ly_private, extensions, pg_temp
as $$
declare
  v_org uuid;
  v_hash text;
begin
  v_org := ly_private.ly_current_org();
  if auth.uid() is null or v_org is null or not ly_private.ly_is_admin() then
    raise exception 'Not authorized';
  end if;
  if length(coalesce(p_new_password,'')) < 4 or length(p_new_password) > 64 then
    raise exception 'Password must be 4-64 characters';
  end if;
  select s.password_hash into v_hash
  from ly_private.ly_menu_security s
  where s.org_id = v_org;
  if v_hash is not null and extensions.crypt(coalesce(p_current_password,''), v_hash) <> v_hash then
    return false;
  end if;
  insert into ly_private.ly_menu_security(org_id,password_hash,updated_at,updated_by)
  values(v_org, extensions.crypt(p_new_password, extensions.gen_salt('bf',10)), now(), auth.uid())
  on conflict(org_id) do update
    set password_hash=excluded.password_hash, updated_at=excluded.updated_at, updated_by=excluded.updated_by;
  return true;
end;
$$;

create or replace function public.ly_disable_menu_password(p_current_password text)
returns boolean
language plpgsql
security definer
set search_path = public, auth, ly_private, extensions, pg_temp
as $$
declare
  v_org uuid;
  v_hash text;
begin
  v_org := ly_private.ly_current_org();
  if auth.uid() is null or v_org is null or not ly_private.ly_is_admin() then
    raise exception 'Not authorized';
  end if;
  select s.password_hash into v_hash from ly_private.ly_menu_security s where s.org_id=v_org;
  if v_hash is null then return true; end if;
  if extensions.crypt(coalesce(p_current_password,''), v_hash) <> v_hash then return false; end if;
  delete from ly_private.ly_menu_security where org_id=v_org;
  return true;
end;
$$;

revoke all on function public.ly_menu_password_status() from public, anon;
revoke all on function public.ly_verify_menu_password(text) from public, anon;
revoke all on function public.ly_set_menu_password(text,text) from public, anon;
revoke all on function public.ly_disable_menu_password(text) from public, anon;
grant execute on function public.ly_menu_password_status() to authenticated, service_role;
grant execute on function public.ly_verify_menu_password(text) to authenticated, service_role;
grant execute on function public.ly_set_menu_password(text,text) to authenticated, service_role;
grant execute on function public.ly_disable_menu_password(text) to authenticated, service_role;
