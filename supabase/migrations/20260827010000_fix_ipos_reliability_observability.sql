-- Fix iPOS receipt-number collisions and make sync health durable.
-- Also harden the remaining bootstrap RPC and optimize notification-device RLS.

begin;

-- iPOS transaction identity is (org_id, ipos_tran_id). iPOS tran_no/receipt_no
-- is display/business data and may be reused, so it must not block a distinct
-- iPOS transaction. Keep receipt-number uniqueness for non-iPOS/manual sales.
drop index if exists public.ly_sales_org_no_uq;
create unique index ly_sales_org_no_manual_uq
  on public.ly_sales(org_id, receipt_no)
  where ipos_tran_id is null;

-- Durable per-invocation iPOS sync history. This lives outside the exposed API.
create table if not exists ly_private.ly_ipos_sync_attempts (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.ly_organizations(id) on delete cascade,
  store_uid text not null,
  attempted_at timestamptz not null default now(),
  success boolean not null,
  error text null
);

alter table ly_private.ly_ipos_sync_attempts enable row level security;
revoke all on table ly_private.ly_ipos_sync_attempts from public, anon, authenticated;
revoke all on sequence ly_private.ly_ipos_sync_attempts_id_seq from public, anon, authenticated;
create index if not exists idx_ly_ipos_sync_attempts_org_store_time
  on ly_private.ly_ipos_sync_attempts(org_id, store_uid, attempted_at desc);

-- Service-only RPC used by the Edge Function once per complete invocation.
create or replace function public.ly_ipos_record_attempt(
  p_org_id uuid,
  p_store_uid text,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  if p_org_id is null or nullif(trim(p_store_uid), '') is null then
    raise exception 'org_id and store_uid are required';
  end if;

  insert into public.ly_ipos_sync_state(
    org_id, store_uid, last_success_at, last_attempt_at, last_error, updated_at
  ) values (
    p_org_id,
    p_store_uid,
    case when p_success then v_now else null end,
    v_now,
    case when p_success then null else left(coalesce(p_error, 'Unknown error'), 2000) end,
    v_now
  )
  on conflict(org_id, store_uid) do update set
    last_success_at = case when p_success then v_now else public.ly_ipos_sync_state.last_success_at end,
    last_attempt_at = v_now,
    last_error = case when p_success then null else left(coalesce(p_error, 'Unknown error'), 2000) end,
    updated_at = v_now;

  insert into ly_private.ly_ipos_sync_attempts(org_id, store_uid, attempted_at, success, error)
  values (
    p_org_id,
    p_store_uid,
    v_now,
    p_success,
    case when p_success then null else left(coalesce(p_error, 'Unknown error'), 2000) end
  );
end;
$$;

revoke all on function public.ly_ipos_record_attempt(uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.ly_ipos_record_attempt(uuid, text, boolean, text) to service_role, postgres;

-- Optimize auth/session helpers in the notification-device policy so they are
-- evaluated once per statement instead of once per row.
drop policy if exists ly_notification_devices_owner on public.ly_notification_devices;
create policy ly_notification_devices_owner
on public.ly_notification_devices
for all
to authenticated
using (
  user_id = (select auth.uid())
  and org_id = (select ly_private.ly_current_org())
)
with check (
  user_id = (select auth.uid())
  and org_id = (select ly_private.ly_current_org())
);

-- Move the final authenticated SECURITY DEFINER implementation out of public,
-- while preserving the public bootstrap RPC contract.
alter function public.ly_bootstrap() rename to ly_bootstrap_impl;
alter function public.ly_bootstrap_impl() set schema ly_private;
revoke all on function ly_private.ly_bootstrap_impl() from public, anon;
grant execute on function ly_private.ly_bootstrap_impl() to authenticated, service_role;

create or replace function public.ly_bootstrap()
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select ly_private.ly_bootstrap_impl();
$$;

revoke all on function public.ly_bootstrap() from public, anon;
grant execute on function public.ly_bootstrap() to authenticated, service_role;

commit;
