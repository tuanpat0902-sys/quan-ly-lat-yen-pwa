-- Fix iPOS receipt-number collisions and preserve incident history.
-- Also harden the remaining bootstrap RPC and optimize notification-device RLS.

begin;

-- iPOS transaction identity is (org_id, ipos_tran_id). iPOS tran_no/receipt_no
-- is display/business data and may be reused, so it must not block a distinct
-- iPOS transaction. Keep receipt-number uniqueness for non-iPOS/manual sales.
drop index if exists public.ly_sales_org_no_uq;
create unique index ly_sales_org_no_manual_uq
  on public.ly_sales(org_id, receipt_no)
  where ipos_tran_id is null;

-- Durable iPOS incident/recovery history. The existing sync-state row remains
-- the current health snapshot; this table preserves failures that would
-- otherwise disappear as soon as a later successful run clears last_error.
create table if not exists ly_private.ly_ipos_sync_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.ly_organizations(id) on delete cascade,
  store_uid text not null,
  event_at timestamptz not null default now(),
  event_type text not null check (event_type in ('failure','recovery')),
  error text null
);

alter table ly_private.ly_ipos_sync_events enable row level security;
revoke all on table ly_private.ly_ipos_sync_events from public, anon, authenticated;
revoke all on sequence ly_private.ly_ipos_sync_events_id_seq from public, anon, authenticated;
create index if not exists idx_ly_ipos_sync_events_org_store_time
  on ly_private.ly_ipos_sync_events(org_id, store_uid, event_at desc);

create or replace function ly_private.ly_capture_ipos_sync_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The Edge Function writes last_error once for each failed invocation.
  -- Preserve every failure, even if the error text repeats, by comparing
  -- last_attempt_at. Successful per-sale state updates do not create noise.
  if new.last_error is not null
     and (
       tg_op = 'INSERT'
       or old.last_attempt_at is distinct from new.last_attempt_at
       or old.last_error is distinct from new.last_error
     ) then
    insert into ly_private.ly_ipos_sync_events(org_id, store_uid, event_at, event_type, error)
    values (
      new.org_id,
      new.store_uid,
      coalesce(new.last_attempt_at, now()),
      'failure',
      left(new.last_error, 2000)
    );
  elsif tg_op = 'UPDATE'
        and old.last_error is not null
        and new.last_error is null then
    insert into ly_private.ly_ipos_sync_events(org_id, store_uid, event_at, event_type, error)
    values (
      new.org_id,
      new.store_uid,
      coalesce(new.last_success_at, new.last_attempt_at, now()),
      'recovery',
      null
    );
  end if;

  return new;
end;
$$;

revoke all on function ly_private.ly_capture_ipos_sync_event() from public, anon, authenticated;

drop trigger if exists trg_ly_capture_ipos_sync_event on public.ly_ipos_sync_state;
create trigger trg_ly_capture_ipos_sync_event
after insert or update of last_attempt_at, last_success_at, last_error
on public.ly_ipos_sync_state
for each row
execute function ly_private.ly_capture_ipos_sync_event();

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
