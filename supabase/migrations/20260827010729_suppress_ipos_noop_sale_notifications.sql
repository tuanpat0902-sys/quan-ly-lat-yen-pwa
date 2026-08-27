create or replace function ly_private.ly_capture_activity_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_org uuid;
  v_id uuid;
  v_name text;
  v_amount numeric;
begin
  -- iPOS runs every minute and may upsert an unchanged sale, touching only
  -- technical sync timestamps. Do not turn those no-op refreshes into
  -- activity events / push notifications.
  if tg_op = 'UPDATE' and tg_table_schema = 'public' and tg_table_name = 'ly_sales' then
    if (
      to_jsonb(new) - 'updated_at' - 'ipos_last_synced_at'
    ) is not distinct from (
      to_jsonb(old) - 'updated_at' - 'ipos_last_synced_at'
    ) then
      return new;
    end if;
  end if;

  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  v_org := nullif(v_row->>'org_id','')::uuid;
  if v_org is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  v_id := nullif(v_row->>'id','')::uuid;
  v_name := coalesce(
    nullif(v_row->>'name',''),
    nullif(v_row->>'receipt_no',''),
    nullif(v_row->>'category',''),
    nullif(v_row->>'description',''),
    nullif(v_row->>'note','')
  );

  begin
    v_amount := nullif(coalesce(v_row->>'total_amount', v_row->>'amount', v_row->>'total'),'')::numeric;
  exception when others then
    v_amount := null;
  end;

  insert into public.ly_activity_events(
    org_id,
    actor_user_id,
    entity_table,
    entity_id,
    event_type,
    entity_name,
    amount
  ) values (
    v_org,
    auth.uid(),
    tg_table_name,
    v_id,
    tg_op,
    v_name,
    v_amount
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function ly_private.ly_capture_activity_event() from public, anon, authenticated;
grant execute on function ly_private.ly_capture_activity_event() to service_role;
