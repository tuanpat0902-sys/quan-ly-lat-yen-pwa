-- ============================================================
-- V265 SINGLE ADMIN AUTH
-- Run AFTER V264 One-Shot SQL.
--
-- IMPORTANT:
-- Create the Auth user manually in:
-- Supabase -> Authentication -> Users -> Add user
--
-- Email: admin@latyen.vn
-- Password: choose your own strong password
-- Auto Confirm User: ON
--
-- Never hard-code the password in the web app.
-- ============================================================

begin;

-- Only the designated admin may bootstrap/use an organization.
create or replace function public.bootstrap_my_organization_v261(
  p_name text default 'LAT YEN'
)
returns table(organization_id uuid)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select u.email
    into v_email
  from auth.users u
  where u.id=v_uid;

  if lower(coalesce(v_email,'')) <> 'admin@latyen.vn' then
    raise exception 'Only admin@latyen.vn may use this application';
  end if;

  select om.organization_id
    into v_org
  from public.organization_members om
  where om.user_id=v_uid
  order by om.created_at
  limit 1;

  if v_org is null then
    insert into public.organizations(
      name,
      created_by
    )
    values (
      coalesce(
        nullif(trim(p_name),''),
        'LAT YEN'
      ),
      v_uid
    )
    returning id into v_org;

    insert into public.organization_members(
      organization_id,
      user_id,
      role
    )
    values (
      v_org,
      v_uid,
      'owner'
    );
  end if;

  return query
    select v_org;
end;
$$;

grant execute
on function public.bootstrap_my_organization_v261(text)
to authenticated;

-- Helper for strict RLS checks.
create or replace function public.is_latyen_admin_v265()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists(
    select 1
    from auth.users u
    where u.id=auth.uid()
      and lower(u.email)='admin@latyen.vn'
  );
$$;

grant execute
on function public.is_latyen_admin_v265()
to authenticated;

-- Tighten business RLS so authenticated non-admin users cannot access data.
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'warehouses',
    'suppliers',
    'ingredients',
    'inventory',
    'products',
    'recipe_items',
    'prepared_ingredient_items',
    'sales',
    'sale_items',
    'stock_transactions'
  ]
  loop
    for p in
      select policyname
      from pg_policies
      where schemaname='public'
        and tablename=t
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        p.policyname,
        t
      );
    end loop;

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_latyen_admin_v265() and organization_id=public.current_organization_id())',
      t||'_v265_select',
      t
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_latyen_admin_v265() and organization_id=public.current_organization_id())',
      t||'_v265_insert',
      t
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_latyen_admin_v265() and organization_id=public.current_organization_id()) with check (public.is_latyen_admin_v265() and organization_id=public.current_organization_id())',
      t||'_v265_update',
      t
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_latyen_admin_v265() and organization_id=public.current_organization_id())',
      t||'_v265_delete',
      t
    );
  end loop;
end $$;

commit;
