-- Phase 2: apply only after the broker-driven notification client is live.
-- Activity rows remain intact and queryable; only their direct Realtime stream
-- is retired because the compact ly_change_signals stream now wakes delta reads.
begin;

do $block$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='ly_change_signals'
  ) then
    raise exception 'ly_change_signals must be published before retiring activity event stream';
  end if;

  if exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='ly_activity_events'
  ) then
    alter publication supabase_realtime drop table public.ly_activity_events;
  end if;
end;
$block$;

commit;
