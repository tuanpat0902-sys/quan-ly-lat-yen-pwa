import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const edge = await readFile(
  new URL('../supabase/functions/ly-ipos-sync/index.ts', import.meta.url),
  'utf8'
);
const migration = await readFile(
  new URL('../supabase/migrations/20260831152338_optimize_ipos_incremental_sync.sql', import.meta.url),
  'utf8'
);
const recipeMigration = await readFile(
  new URL('../supabase/migrations/20260831153558_coalesce_ipos_recipe_reconciliation.sql', import.meta.url),
  'utf8'
);
const scheduleMigration = await readFile(
  new URL('../supabase/migrations/20260901074248_reduce_ipos_sync_schedule_egress.sql', import.meta.url),
  'utf8'
);
const performance = await readFile(new URL('../ly-performance-optimizer.js', import.meta.url),'utf8');
const shell = await readFile(new URL('../index.html', import.meta.url),'utf8');

assert.match(edge,/fetchSaleHeadersForDay/,'the lightweight sale list must be fetched separately');
assert.match(edge,/ly_ipos_changed_sale_ids/,'stored iPOS versions must filter unchanged receipts');
assert.match(edge,/fetchChangedSaleDetails\(config,changedHeaders\)/,'details must only be fetched for changed receipts');
assert.match(edge,/body\.force===true/,'operators must retain an explicit full-refresh escape hatch');
assert.match(edge,/sale_headers_fetched:[\s\S]*sale_details_fetched:[\s\S]*sales_unchanged:/,'sync observability must report incremental work');

assert.match(migration,/s\.ipos_sale_updated_at<>i\.sale_updated_at/,'changed receipt detection must compare authoritative iPOS versions');
assert.match(migration,/substring\([\s\S]*\^EDT_/,'edited transaction ids must use the canonical receipt identity');
assert.match(migration,/create or replace function public\.ly_ipos_upsert_sale_with_inventory/,'sale and inventory writes must share one RPC transaction');
assert.match(migration,/revoke all on function public\.ly_ipos_changed_sale_ids\(uuid,jsonb\) from public,anon,authenticated/,'the internal version filter must not be exposed to users');

assert.match(recipeMigration,/pg_advisory_xact_lock/,'concurrent recipe saves for one product must be serialized');
assert.match(recipeMigration,/set_config\('ly\.skip_ipos_recipe_reconcile','on',true\)[\s\S]*set_config\('ly\.skip_ipos_recipe_reconcile','off',true\)/,'row-level reconciliation must be suspended during full recipe replacement');
assert.match(recipeMigration,/perform public\.ly_ipos_reconcile_product_inventory\(v_org,v_id\)/,'a completed recipe save must reconcile its historical receipts once');
assert.match(recipeMigration,/current_setting\('ly\.skip_ipos_recipe_reconcile',true\)/,'direct recipe-row edits must retain automatic reconciliation');
assert.match(scheduleMigration,/schedule=>'\*\/5 0-16,23 \* \* \*'/,'iPOS cron must run every five minutes only from 06:00 through 23:59 Vietnam time');
assert.match(performance,/LIVE_MS=900000,FALLBACK_MS=120000/,'empty client fallback pulls must be sparse when Realtime is healthy');
assert.match(performance,/reason!=='manual'&&quietHours\(\)&&pendingCount\(\)===0/,'automatic client reads must pause from midnight through 06:00 without blocking pending writes or manual refresh');
assert.match(shell,/V269_PULL_INTERVAL_MS=900000/,'legacy fallback path must retain the same sparse pull floor');

console.log('iPOS incremental synchronization checks passed');
