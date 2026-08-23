-- Applied to Supabase project isfotiyxufvsmlkqsgez
-- Migration: notification_delivery_telemetry

create table if not exists public.ly_notification_devices (
  client_id text primary key,
  org_id uuid not null references public.ly_organizations(id) on delete cascade,
  user_id uuid not null,
  user_agent text,
  permission text,
  sw_supported boolean not null default false,
  sw_active boolean not null default false,
  sw_controller boolean not null default false,
  last_attempt_status text,
  last_attempt_error text,
  last_attempt_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.ly_notification_devices enable row level security;

drop policy if exists ly_notification_devices_owner on public.ly_notification_devices;
create policy ly_notification_devices_owner
on public.ly_notification_devices
for all
to authenticated
using (
  user_id = auth.uid()
  and org_id = ly_private.ly_current_org()
)
with check (
  user_id = auth.uid()
  and org_id = ly_private.ly_current_org()
);

grant select, insert, update, delete on public.ly_notification_devices to authenticated;
revoke all on public.ly_notification_devices from anon;

create index if not exists idx_ly_notification_devices_org_id
  on public.ly_notification_devices(org_id);
create index if not exists idx_ly_notification_devices_user_id
  on public.ly_notification_devices(user_id);
create index if not exists idx_ly_notification_devices_last_seen_at
  on public.ly_notification_devices(last_seen_at desc);
