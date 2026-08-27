alter table public.ly_ipos_sync_state
  add column if not exists reconcile_day date,
  add column if not exists reconcile_candidate_tran_id text,
  add column if not exists reconcile_candidate_seen_count integer not null default 0,
  add column if not exists reconcile_candidate_first_seen_at timestamptz,
  add column if not exists reconcile_last_observed_at timestamptz;

alter table public.ly_ipos_sync_state
  drop constraint if exists ly_ipos_sync_state_reconcile_seen_nonnegative;

alter table public.ly_ipos_sync_state
  add constraint ly_ipos_sync_state_reconcile_seen_nonnegative
  check (reconcile_candidate_seen_count >= 0);
