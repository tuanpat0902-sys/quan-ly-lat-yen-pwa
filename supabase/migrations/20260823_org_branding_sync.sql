create table if not exists public.ly_org_branding (
  org_id uuid primary key references public.ly_organizations(id) on delete cascade,
  software_name text not null default 'QUẢN LÝ LÁT YÊN',
  logo_data text,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint ly_org_branding_name_not_blank check (length(btrim(software_name)) between 1 and 120),
  constraint ly_org_branding_logo_size check (logo_data is null or octet_length(logo_data) <= 1572864)
);

alter table public.ly_org_branding enable row level security;

drop policy if exists ly_org_branding_select on public.ly_org_branding;
drop policy if exists ly_org_branding_admin_insert on public.ly_org_branding;
drop policy if exists ly_org_branding_admin_update on public.ly_org_branding;
drop policy if exists ly_org_branding_admin_delete on public.ly_org_branding;

create policy ly_org_branding_select
on public.ly_org_branding
for select
to authenticated
using (org_id = ly_private.ly_current_org());

create policy ly_org_branding_admin_insert
on public.ly_org_branding
for insert
to authenticated
with check (org_id = ly_private.ly_current_org() and ly_private.ly_is_admin());

create policy ly_org_branding_admin_update
on public.ly_org_branding
for update
to authenticated
using (org_id = ly_private.ly_current_org() and ly_private.ly_is_admin())
with check (org_id = ly_private.ly_current_org() and ly_private.ly_is_admin());

create policy ly_org_branding_admin_delete
on public.ly_org_branding
for delete
to authenticated
using (org_id = ly_private.ly_current_org() and ly_private.ly_is_admin());

revoke all on public.ly_org_branding from public, anon;
grant select, insert, update, delete on public.ly_org_branding to authenticated;
grant all on public.ly_org_branding to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='ly_org_branding'
  ) then
    alter publication supabase_realtime add table public.ly_org_branding;
  end if;
end $$;
