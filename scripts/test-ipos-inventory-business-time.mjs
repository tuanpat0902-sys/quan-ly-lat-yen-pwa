import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20260831043050_ipos_sale_inventory_business_time.sql', import.meta.url),
  'utf8'
);
const edge = await readFile(
  new URL('../supabase/functions/ly-ipos-sync/index.ts', import.meta.url),
  'utf8'
);

assert.match(edge, /ly_ipos_upsert_sale/, 'iPOS sale details must be saved even without recipe lines');
assert.match(edge, /ly_ipos_apply_sale_inventory/, 'inventory must reconcile after every iPOS sale save');
assert.match(migration, /source_id,quantity,note,created_at[\s\S]*coalesce\(v_sale\.sold_at,now\(\)\)/, 'SALE movements must use the receipt business time');
assert.match(migration, /from public\.ly_sales s[\s\S]*s\.source='iPOS'/, 'existing iPOS SALE movements must be backfilled to receipt time');
assert.match(migration, /update public\.ly_activity_events e[\s\S]*entity_table='ly_stock_transactions'/, 'activity history must align with the stock movement time');
assert.match(migration, /revoke all on function public\.ly_ipos_apply_sale_inventory\(uuid,uuid\) from public,anon,authenticated/, 'internal inventory function must not be public');

console.log('iPOS inventory business-time checks passed');
