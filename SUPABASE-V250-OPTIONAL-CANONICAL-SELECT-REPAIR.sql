-- OPTIONAL: repair direct SELECT for app_sync_state.
-- V250 does not require this because RPC fallback handles canonical reads.

begin;

alter table public.app_sync_state enable row level security;

drop policy if exists "app_sync_state_select" on public.app_sync_state;

create policy "app_sync_state_select"
on public.app_sync_state
for select
to anon, authenticated
using (true);

grant select on public.app_sync_state
to anon, authenticated;

commit;
