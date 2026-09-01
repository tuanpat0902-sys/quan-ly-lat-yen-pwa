begin;

-- Realtime broker: business tables remain authoritative, but clients listen to
-- one compact signal row per organization/domain instead of every changed row.
create table public.ly_change_signals (
  org_id uuid not null references public.ly_organizations(id) on delete cascade,
  domain text not null,
  revision bigint not null default 1,
  last_table text not null,
  changed_at timestamptz not null default now(),
  primary key (org_id, domain),
  constraint ly_change_signals_domain_check check (
    domain in ('masterData','ingredients','products','inventory','imports','exports','stocktake','sales','cashflow')
  )
);

alter table public.ly_change_signals enable row level security;

create policy ly_change_signals_select
on public.ly_change_signals
for select
to authenticated
using (org_id = ly_private.ly_current_org());

revoke all on public.ly_change_signals from public, anon;
grant select on public.ly_change_signals to authenticated;
grant all on public.ly_change_signals to service_role;

create or replace function ly_private.ly_emit_change_signal(
  p_org_id uuid,
  p_domain text,
  p_table text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_org_id is null then return; end if;
  insert into public.ly_change_signals(org_id,domain,revision,last_table,changed_at)
  values(p_org_id,p_domain,1,p_table,clock_timestamp())
  on conflict (org_id,domain) do update
  set revision=public.ly_change_signals.revision+1,
      last_table=excluded.last_table,
      changed_at=excluded.changed_at;
end;
$function$;

create or replace function ly_private.ly_signal_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare v_org_id uuid;
begin
  if current_setting('ly.suppress_change_signals',true)='on' then return null; end if;
  for v_org_id in select distinct org_id from new_rows where org_id is not null loop
    perform ly_private.ly_emit_change_signal(v_org_id,TG_ARGV[0],TG_TABLE_NAME);
  end loop;
  return null;
end;
$function$;

create or replace function ly_private.ly_signal_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare v_org_id uuid;
begin
  if current_setting('ly.suppress_change_signals',true)='on' then return null; end if;
  for v_org_id in
    select distinct org_id from (
      select org_id from new_rows
      union all
      select org_id from old_rows
    ) changed where org_id is not null
  loop
    perform ly_private.ly_emit_change_signal(v_org_id,TG_ARGV[0],TG_TABLE_NAME);
  end loop;
  return null;
end;
$function$;

create or replace function ly_private.ly_signal_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare v_org_id uuid;
begin
  if current_setting('ly.suppress_change_signals',true)='on' then return null; end if;
  for v_org_id in select distinct org_id from old_rows where org_id is not null loop
    perform ly_private.ly_emit_change_signal(v_org_id,TG_ARGV[0],TG_TABLE_NAME);
  end loop;
  return null;
end;
$function$;

revoke all on function ly_private.ly_emit_change_signal(uuid,text,text) from public,anon,authenticated;
revoke all on function ly_private.ly_signal_insert() from public,anon,authenticated;
revoke all on function ly_private.ly_signal_update() from public,anon,authenticated;
revoke all on function ly_private.ly_signal_delete() from public,anon,authenticated;

do $block$
declare r record;
begin
  for r in
    select * from (values
      ('ly_warehouses','masterData'),('ly_suppliers','masterData'),
      ('ly_ingredients','ingredients'),('ly_prepared_items','ingredients'),
      ('ly_products','products'),('ly_recipe_items','products'),
      ('ly_inventory','inventory'),('ly_stock_transactions','inventory'),
      ('ly_import_receipts','imports'),('ly_import_items','imports'),
      ('ly_export_receipts','exports'),('ly_export_items','exports'),
      ('ly_stocktake_receipts','stocktake'),('ly_stocktake_items','stocktake'),
      ('ly_sales','sales'),('ly_sale_items','sales'),
      ('ly_cashflow_entries','cashflow')
    ) mapped(table_name,domain_name)
  loop
    execute format('drop trigger if exists ly_signal_insert on public.%I',r.table_name);
    execute format('drop trigger if exists ly_signal_update on public.%I',r.table_name);
    execute format('drop trigger if exists ly_signal_delete on public.%I',r.table_name);
    execute format(
      'create trigger ly_signal_insert after insert on public.%I referencing new table as new_rows for each statement execute function ly_private.ly_signal_insert(%L)',
      r.table_name,r.domain_name
    );
    execute format(
      'create trigger ly_signal_update after update on public.%I referencing old table as old_rows new table as new_rows for each statement execute function ly_private.ly_signal_update(%L)',
      r.table_name,r.domain_name
    );
    execute format(
      'create trigger ly_signal_delete after delete on public.%I referencing old table as old_rows for each statement execute function ly_private.ly_signal_delete(%L)',
      r.table_name,r.domain_name
    );
  end loop;
end;
$block$;

-- The high-volume iPOS path can update many inventory rows. Suppress row/table
-- signals inside the atomic receipt transaction, then emit only two domains.
create or replace function public.ly_ipos_upsert_sale_with_inventory(
  p_org_id uuid,
  p_warehouse_id uuid,
  p_sale jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_sale jsonb;
  v_inventory jsonb;
  v_previous_suppress text;
begin
  v_previous_suppress := current_setting('ly.suppress_change_signals',true);
  perform set_config('ly.suppress_change_signals','on',true);

  v_sale := public.ly_ipos_upsert_sale(p_org_id,p_warehouse_id,p_sale);
  if coalesce((v_sale->>'stale_ignored')::boolean,false) then
    perform set_config('ly.suppress_change_signals',coalesce(v_previous_suppress,''),true);
    return v_sale || jsonb_build_object('inventory_skipped',true,'inventory_changed',false);
  end if;

  v_inventory := public.ly_ipos_apply_sale_inventory(p_org_id,(v_sale->>'sale_id')::uuid);
  perform set_config('ly.suppress_change_signals',coalesce(v_previous_suppress,''),true);

  if coalesce(v_previous_suppress,'')<>'on' then
    perform ly_private.ly_emit_change_signal(p_org_id,'sales','ly_sales');
    if coalesce((v_inventory->>'inventory_changed')::boolean,false) then
      perform ly_private.ly_emit_change_signal(p_org_id,'inventory','ly_inventory');
    end if;
  end if;

  return v_sale || v_inventory || jsonb_build_object('inventory_skipped',false);
end;
$function$;

revoke all on function public.ly_ipos_upsert_sale_with_inventory(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.ly_ipos_upsert_sale_with_inventory(uuid,uuid,jsonb) to postgres,service_role;

do $block$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='ly_change_signals'
  ) then
    alter publication supabase_realtime add table public.ly_change_signals;
  end if;
end;
$block$;

commit;
