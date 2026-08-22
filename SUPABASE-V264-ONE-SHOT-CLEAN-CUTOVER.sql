-- ============================================================
-- LAT YEN V264 - ONE-SHOT CLEAN AUTH CLOUD CUTOVER
-- TEST ENVIRONMENT / DESTRUCTIVE DATA RESET
--
-- This script:
-- 1) Keeps schema/table identities used by the app.
-- 2) Deletes ALL existing business data.
-- 3) Creates Supabase Auth organization model.
-- 4) Adds organization_id / updated_at / version / deleted_at.
-- 5) Enables strict authenticated RLS.
-- 6) Removes anon business-data access.
-- 7) Creates transactional reset RPC.
--
-- Run this ONCE, then deploy the V264 GitHub package.
-- ============================================================

begin;

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- 1. Clean current test business data, child -> parent.
-- ------------------------------------------------------------
delete from public.sale_items;
delete from public.stock_transactions;
delete from public.sales;
delete from public.recipe_items;
delete from public.prepared_ingredient_items;
delete from public.inventory;
delete from public.products;
delete from public.ingredients;
delete from public.suppliers;
delete from public.warehouses;

-- Legacy canonical state is no longer authoritative.
delete from public.app_sync_state;

-- ------------------------------------------------------------
-- 2. Auth / organization tables.
-- ------------------------------------------------------------
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner'
    check (role in ('owner','admin','manager','staff','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

alter table public.user_profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- ------------------------------------------------------------
-- 3. Current organization helper.
-- ------------------------------------------------------------
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select om.organization_id
  from public.organization_members om
  where om.user_id = auth.uid()
  order by
    case om.role
      when 'owner' then 1
      when 'admin' then 2
      when 'manager' then 3
      when 'staff' then 4
      else 5
    end,
    om.created_at
  limit 1;
$$;

grant execute on function public.current_organization_id() to authenticated;

-- ------------------------------------------------------------
-- 4. Add V2 columns to all existing business tables.
-- ------------------------------------------------------------
do $$
declare
  t text;
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
    execute format(
      'alter table public.%I add column if not exists organization_id uuid references public.organizations(id)',
      t
    );

    execute format(
      'alter table public.%I alter column organization_id set default public.current_organization_id()',
      t
    );

    execute format(
      'alter table public.%I add column if not exists updated_at timestamptz not null default now()',
      t
    );

    execute format(
      'alter table public.%I add column if not exists version bigint not null default 1',
      t
    );

    execute format(
      'alter table public.%I add column if not exists deleted_at timestamptz',
      t
    );

    execute format(
      'create index if not exists %I on public.%I (organization_id)',
      t||'_organization_id_idx',
      t
    );

    execute format(
      'create index if not exists %I on public.%I (organization_id,updated_at)',
      t||'_org_updated_idx',
      t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 5. Server-managed version/update timestamp.
-- ------------------------------------------------------------
create or replace function public.v264_touch_business_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  if tg_op='UPDATE' then
    new.version := coalesce(old.version,0)+1;
  elsif new.version is null then
    new.version := 1;
  end if;

  if new.organization_id is null then
    new.organization_id := public.current_organization_id();
  end if;

  return new;
end;
$$;

do $$
declare
  t text;
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
    execute format(
      'drop trigger if exists %I on public.%I',
      'trg_'||t||'_v264_touch',
      t
    );

    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.v264_touch_business_row()',
      'trg_'||t||'_v264_touch',
      t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 6. Bootstrap organization for each authenticated owner.
-- No legacy data claiming is needed because V264 starts clean.
-- ------------------------------------------------------------
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
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select om.organization_id
    into v_org
  from public.organization_members om
  where om.user_id=v_uid
  order by om.created_at
  limit 1;

  if v_org is null then
    insert into public.organizations(name,created_by)
    values (
      coalesce(nullif(trim(p_name),''),'LAT YEN'),
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

  return query select v_org;
end;
$$;

grant execute
on function public.bootstrap_my_organization_v261(text)
to authenticated;

-- ------------------------------------------------------------
-- 7. Auth profile / organization RLS.
-- ------------------------------------------------------------
drop policy if exists user_profiles_self_select on public.user_profiles;
drop policy if exists user_profiles_self_insert on public.user_profiles;
drop policy if exists user_profiles_self_update on public.user_profiles;

create policy user_profiles_self_select
on public.user_profiles
for select
to authenticated
using (user_id=auth.uid());

create policy user_profiles_self_insert
on public.user_profiles
for insert
to authenticated
with check (user_id=auth.uid());

create policy user_profiles_self_update
on public.user_profiles
for update
to authenticated
using (user_id=auth.uid())
with check (user_id=auth.uid());

drop policy if exists org_select_member on public.organizations;
drop policy if exists org_member_select on public.organization_members;

create policy org_select_member
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id=id
      and om.user_id=auth.uid()
  )
);

create policy org_member_select
on public.organization_members
for select
to authenticated
using (user_id=auth.uid());

-- ------------------------------------------------------------
-- 8. Replace ALL legacy broad business policies with strict org RLS.
-- ------------------------------------------------------------
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
    execute format(
      'alter table public.%I enable row level security',
      t
    );

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
      'create policy %I on public.%I for select to authenticated using (organization_id=public.current_organization_id())',
      t||'_v264_select',
      t
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (organization_id=public.current_organization_id())',
      t||'_v264_insert',
      t
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (organization_id=public.current_organization_id()) with check (organization_id=public.current_organization_id())',
      t||'_v264_update',
      t
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (organization_id=public.current_organization_id())',
      t||'_v264_delete',
      t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 9. Permissions: authenticated only.
-- ------------------------------------------------------------
revoke all on table
  public.warehouses,
  public.suppliers,
  public.ingredients,
  public.inventory,
  public.products,
  public.recipe_items,
  public.prepared_ingredient_items,
  public.sales,
  public.sale_items,
  public.stock_transactions
from anon;

grant select,insert,update,delete on table
  public.warehouses,
  public.suppliers,
  public.ingredients,
  public.inventory,
  public.products,
  public.recipe_items,
  public.prepared_ingredient_items,
  public.sales,
  public.sale_items,
  public.stock_transactions
to authenticated;

-- ------------------------------------------------------------
-- 10. Transactional organization reset.
-- ------------------------------------------------------------
create or replace function public.reset_my_organization_v264()
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

  delete from public.stock_transactions where organization_id=v_org;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.sale_items where organization_id=v_org;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.sales where organization_id=v_org;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.recipe_items where organization_id=v_org;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.prepared_ingredient_items where organization_id=v_org;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.inventory where organization_id=v_org;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.products where organization_id=v_org;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.ingredients where organization_id=v_org;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.suppliers where organization_id=v_org;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.warehouses where organization_id=v_org;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  return jsonb_build_object(
    'ok',true,
    'organization_id',v_org,
    'deleted_records',v_total,
    'deleted_at',now()
  );
end;
$$;

grant execute
on function public.reset_my_organization_v264()
to authenticated;

revoke all
on function public.reset_my_organization_v264()
from anon;

commit;
