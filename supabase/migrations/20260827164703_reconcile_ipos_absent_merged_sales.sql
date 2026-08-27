create or replace function public.ly_ipos_reconcile_absent_sales(
  p_org_id uuid,
  p_store_uid text,
  p_day date,
  p_active_tran_ids jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_active_count integer := 0;
  v_local_count integer := 0;
  v_stale_count integer := 0;
  v_candidate_id uuid;
  v_candidate_tran_id text;
  v_candidate_receipt text;
  v_candidate_total numeric;
  v_candidate_last_synced timestamptz;
  v_prev_day date;
  v_prev_tran_id text;
  v_prev_seen integer := 0;
  v_seen integer := 0;
  v_deleted boolean := false;
begin
  if p_org_id is null or nullif(trim(p_store_uid),'') is null or p_day is null then
    raise exception 'org_id, store_uid and day are required';
  end if;
  if p_active_tran_ids is null or jsonb_typeof(p_active_tran_ids) <> 'array' then
    raise exception 'active_tran_ids must be a JSON array';
  end if;

  v_start := (p_day::timestamp at time zone 'Asia/Bangkok');
  v_end := v_start + interval '1 day';

  select count(distinct value)
    into v_active_count
  from jsonb_array_elements_text(p_active_tran_ids) ids(value)
  where nullif(trim(value),'') is not null;

  select count(*)
    into v_local_count
  from public.ly_sales s
  where s.org_id = p_org_id
    and s.ipos_store_uid = p_store_uid
    and s.source = 'iPOS'
    and s.sold_at >= v_start
    and s.sold_at < v_end
    and s.ipos_tran_id is not null;

  with active_ids as (
    select distinct value as tran_id
    from jsonb_array_elements_text(p_active_tran_ids) ids(value)
    where nullif(trim(value),'') is not null
  ), stale as (
    select s.id,s.ipos_tran_id,s.receipt_no,s.total_amount,s.ipos_last_synced_at
    from public.ly_sales s
    where s.org_id = p_org_id
      and s.ipos_store_uid = p_store_uid
      and s.source = 'iPOS'
      and s.sold_at >= v_start
      and s.sold_at < v_end
      and s.ipos_tran_id is not null
      and not exists (select 1 from active_ids a where a.tran_id = s.ipos_tran_id)
  )
  select count(*),
         (array_agg(id order by id))[1],
         (array_agg(ipos_tran_id order by id))[1],
         (array_agg(receipt_no order by id))[1],
         (array_agg(total_amount order by id))[1],
         (array_agg(ipos_last_synced_at order by id))[1]
    into v_stale_count,v_candidate_id,v_candidate_tran_id,v_candidate_receipt,v_candidate_total,v_candidate_last_synced
  from stale;

  if v_stale_count <> 1 or v_local_count <> v_active_count + 1 then
    update public.ly_ipos_sync_state
       set reconcile_day = p_day,
           reconcile_candidate_tran_id = null,
           reconcile_candidate_seen_count = 0,
           reconcile_candidate_first_seen_at = null,
           reconcile_last_observed_at = now()
     where org_id = p_org_id and store_uid = p_store_uid;

    return jsonb_build_object(
      'deleted',false,'guard_pass',false,'active_count',v_active_count,
      'local_count',v_local_count,'stale_count',v_stale_count,'seen_count',0,
      'inventory_changed',false
    );
  end if;

  select reconcile_day,reconcile_candidate_tran_id,reconcile_candidate_seen_count
    into v_prev_day,v_prev_tran_id,v_prev_seen
  from public.ly_ipos_sync_state
  where org_id = p_org_id and store_uid = p_store_uid
  for update;

  if v_prev_day = p_day and v_prev_tran_id = v_candidate_tran_id then
    v_seen := coalesce(v_prev_seen,0) + 1;
  else
    v_seen := 1;
  end if;

  update public.ly_ipos_sync_state
     set reconcile_day = p_day,
         reconcile_candidate_tran_id = v_candidate_tran_id,
         reconcile_candidate_seen_count = v_seen,
         reconcile_candidate_first_seen_at = case
           when v_prev_day = p_day and v_prev_tran_id = v_candidate_tran_id
             then coalesce(reconcile_candidate_first_seen_at,now())
           else now()
         end,
         reconcile_last_observed_at = now()
   where org_id = p_org_id and store_uid = p_store_uid;

  if v_seen >= 3
     and v_candidate_last_synced is not null
     and v_candidate_last_synced <= now() - interval '2 minutes' then
    delete from public.ly_sales
    where id = v_candidate_id
      and org_id = p_org_id
      and ipos_tran_id = v_candidate_tran_id;
    v_deleted := found;

    if v_deleted then
      update public.ly_ipos_sync_state
         set reconcile_candidate_tran_id = null,
             reconcile_candidate_seen_count = 0,
             reconcile_candidate_first_seen_at = null,
             reconcile_last_observed_at = now()
       where org_id = p_org_id and store_uid = p_store_uid;
    end if;
  end if;

  return jsonb_build_object(
    'deleted',v_deleted,
    'guard_pass',true,
    'active_count',v_active_count,
    'local_count',v_local_count,
    'stale_count',v_stale_count,
    'candidate_tran_id',v_candidate_tran_id,
    'candidate_receipt_no',v_candidate_receipt,
    'candidate_total_amount',v_candidate_total,
    'candidate_last_synced_at',v_candidate_last_synced,
    'seen_count',v_seen,
    'required_seen_count',3,
    'inventory_changed',false
  );
end;
$function$;

revoke all on function public.ly_ipos_reconcile_absent_sales(uuid,text,date,jsonb) from public, anon, authenticated;
grant execute on function public.ly_ipos_reconcile_absent_sales(uuid,text,date,jsonb) to service_role;
