import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const edge=await fs.readFile(new URL('../supabase/functions/ly-ipos-sync/index.ts',import.meta.url),'utf8');
const deletedMigration=await fs.readFile(new URL('../supabase/migrations/20260827163803_handle_ipos_deleted_merged_sales.sql',import.meta.url),'utf8');
const stateMigration=await fs.readFile(new URL('../supabase/migrations/20260827164610_guard_ipos_absent_sale_reconciliation.sql',import.meta.url),'utf8');
const reconcileMigration=await fs.readFile(new URL('../supabase/migrations/20260827164703_reconcile_ipos_absent_merged_sales.sql',import.meta.url),'utf8');

assert.match(edge,/function canonicalTranId/);
assert.match(edge,/\^EDT_\(\.\+\)_\[0-9\]\+\$/);
assert.match(edge,/sale\.deleted===true\?sale:await fetchSaleDetail/);
assert.match(edge,/ly_ipos_delete_sale/);
assert.match(edge,/deletedSales=current\.filter\(s=>s\.deleted===true\)/);
assert.match(edge,/activeByCanonical=new Map/);
assert.match(edge,/!requestedDate&&windows\.length===1/);
assert.match(edge,/ly_ipos_reconcile_absent_sales/);
assert.match(edge,/p_active_tran_ids:\[\.\.\.activeByCanonical\.keys\(\)\]/);
assert.match(edge,/inventory_changed:false/);

assert.match(deletedMigration,/substring\(v_raw_tran_id from '\^EDT_\(\.\+\)_\[0-9\]\+\$'\)/);
assert.match(deletedMigration,/p_sale_updated_at < v_existing_updated/);
assert.match(deletedMigration,/delete from public\.ly_sales/);
assert.match(deletedMigration,/inventory_changed', false/);
assert.match(deletedMigration,/revoke all on function public\.ly_ipos_delete_sale\(uuid,text,bigint\) from public, anon, authenticated/);
assert.match(deletedMigration,/grant execute on function public\.ly_ipos_delete_sale\(uuid,text,bigint\) to service_role/);

for(const column of ['reconcile_day','reconcile_candidate_tran_id','reconcile_candidate_seen_count','reconcile_candidate_first_seen_at','reconcile_last_observed_at']){
  assert.ok(stateMigration.includes(column));
}
assert.match(stateMigration,/reconcile_candidate_seen_count >= 0/);

assert.match(reconcileMigration,/v_stale_count <> 1 or v_local_count <> v_active_count \+ 1/);
assert.match(reconcileMigration,/v_seen >= 3/);
assert.match(reconcileMigration,/v_candidate_last_synced <= now\(\) - interval '2 minutes'/);
assert.match(reconcileMigration,/s\.source = 'iPOS'/);
assert.match(reconcileMigration,/not exists \(select 1 from active_ids a where a\.tran_id = s\.ipos_tran_id\)/);
assert.match(reconcileMigration,/delete from public\.ly_sales/);
assert.match(reconcileMigration,/inventory_changed',false/);
assert.match(reconcileMigration,/revoke all on function public\.ly_ipos_reconcile_absent_sales\(uuid,text,date,jsonb\) from public, anon, authenticated/);
assert.match(reconcileMigration,/grant execute on function public\.ly_ipos_reconcile_absent_sales\(uuid,text,date,jsonb\) to service_role/);

console.log('iPOS merged-sale reconciliation guard: PASS');
