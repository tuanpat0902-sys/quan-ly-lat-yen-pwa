-- pg_cron runs in GMT on this project. Vietnam business hours 06:00-23:59
-- therefore map to 23:00 and 00:00-16:59 GMT. Five-minute cadence cuts
-- scheduled calls from 1,440/day to 216/day while incremental cursors catch up.
begin;

do $block$
declare v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname='ly_ipos_sync_every_minute'
  limit 1;

  if v_job_id is null then
    raise exception 'Expected cron job ly_ipos_sync_every_minute was not found';
  end if;

  perform cron.alter_job(
    job_id=>v_job_id,
    schedule=>'*/5 0-16,23 * * *'
  );
end;
$block$;

commit;
