-- Phase 2: run only after the broker-aware web client has passed production.
-- Keeping this separate prevents older open clients from losing live updates
-- during the deployment window.
begin;

do $block$
declare r record;
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='ly_change_signals'
  ) then
    raise exception 'ly_change_signals must be published before retiring direct business streams';
  end if;

  for r in
    select tablename from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public'
      and tablename=any(array[
        'ly_warehouses','ly_suppliers','ly_ingredients','ly_prepared_items',
        'ly_products','ly_recipe_items','ly_inventory','ly_stock_transactions',
        'ly_import_receipts','ly_import_items','ly_export_receipts','ly_export_items',
        'ly_stocktake_receipts','ly_stocktake_items','ly_sales','ly_sale_items','ly_cashflow_entries'
      ])
  loop
    execute format('alter publication supabase_realtime drop table public.%I',r.tablename);
  end loop;
end;
$block$;

commit;
