-- V189 - Transactional canonical sync
-- Chạy 1 lần trong Supabase > SQL Editor.

create table if not exists public.app_sync_state (
  sync_key text primary key,
  revision bigint not null default 0,
  envelope jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_sync_state enable row level security;

drop policy if exists "app_sync_state_select" on public.app_sync_state;
create policy "app_sync_state_select"
on public.app_sync_state
for select
to anon, authenticated
using (true);

drop policy if exists "app_sync_state_insert" on public.app_sync_state;
create policy "app_sync_state_insert"
on public.app_sync_state
for insert
to anon, authenticated
with check (true);

drop policy if exists "app_sync_state_update" on public.app_sync_state;
create policy "app_sync_state_update"
on public.app_sync_state
for update
to anon, authenticated
using (true)
with check (true);

create or replace function public.commit_app_sync_state(
  p_sync_key text,
  p_expected_revision bigint,
  p_envelope jsonb
)
returns table (
  success boolean,
  revision bigint,
  envelope jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.app_sync_state%rowtype;
begin
  insert into public.app_sync_state(sync_key, revision, envelope)
  values (p_sync_key, 0, null)
  on conflict (sync_key) do nothing;

  update public.app_sync_state
  set
    revision = app_sync_state.revision + 1,
    envelope = p_envelope,
    updated_at = now()
  where
    sync_key = p_sync_key
    and app_sync_state.revision = p_expected_revision
  returning * into v_row;

  if found then
    return query
    select
      true,
      v_row.revision,
      v_row.envelope,
      v_row.updated_at;
    return;
  end if;

  select *
  into v_row
  from public.app_sync_state
  where sync_key = p_sync_key;

  return query
  select
    false,
    coalesce(v_row.revision, 0),
    v_row.envelope,
    v_row.updated_at;
end;
$$;

grant execute on function public.commit_app_sync_state(text,bigint,jsonb)
to anon, authenticated;

grant select, insert, update on public.app_sync_state
to anon, authenticated;
