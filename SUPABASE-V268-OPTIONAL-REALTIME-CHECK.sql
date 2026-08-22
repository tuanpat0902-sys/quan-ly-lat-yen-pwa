-- ============================================================
-- LAT YEN V268 - OPTIONAL CLOUD SYNC VERIFICATION
-- No schema migration is required for V268.
-- This query only verifies Realtime publication membership.
-- It does NOT modify or delete data.
-- ============================================================

select
  schemaname,
  tablename
from pg_publication_tables
where pubname='supabase_realtime'
  and schemaname='public'
  and tablename in (
    'warehouses',
    'suppliers',
    'ingredients',
    'inventory',
    'products',
    'recipe_items',
    'prepared_ingredient_items',
    'sales',
    'sale_items',
    'stock_transactions'
  )
order by tablename;
