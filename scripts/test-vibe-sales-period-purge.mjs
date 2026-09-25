import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const maintenance=await fs.readFile(new URL('./vibehost-maintenance-api.mjs',import.meta.url),'utf8');
const worker=await fs.readFile(new URL('./vibehost-ipos-worker.mjs',import.meta.url),'utf8');
const server=await fs.readFile(new URL('./vibehost-static-server.mjs',import.meta.url),'utf8');
const domains=await fs.readFile(new URL('./vibehost-domain-read-api.mjs',import.meta.url),'utf8');
const maintenancePage=await fs.readFile(new URL('../maintenance-august-2026-sales.html',import.meta.url),'utf8');

for(const fragment of ['2026-07-31T17:00:00.000Z','2026-08-31T17:00:00.000Z','DELETE SALES 2026-08','ly_runtime_cleanup_backups','ly_runtime_cleanup_backup_rows','ly_sales','ly_sale_items','ly_stock_transactions','ly_activity_events','repairImpossiblePositiveInventory','ipos_sales_floor'])assert.ok(maintenance.includes(fragment),`missing purge safeguard: ${fragment}`);
assert.match(maintenance,/begin[\s\S]*pg_advisory_xact_lock[\s\S]*backupRows[\s\S]*delete from[\s\S]*repairImpossiblePositiveInventory[\s\S]*commit/,'purge must backup, delete and reconcile in one locked transaction');
assert.match(maintenance,/sold_at >= \$2::timestamptz and sold_at < \$3::timestamptz/,'period must use an exclusive end boundary');
assert.match(worker,/salesFloor=await syncStateValue\(client,'ipos_sales_floor'\)[\s\S]*from=laterDay\(requestedFrom,salesFloor\)/,'iPOS must never re-import a purged period');
assert.match(worker,/writeFloor=await syncStateValue\(client,'ipos_sales_floor'\)[\s\S]*plan\.label<writeFloor/,'iPOS must re-check the floor after acquiring the inventory lock');
assert.match(server,/handleMaintenanceApi\(request, response, pathname\)/,'server must route authenticated maintenance requests');
assert.match(domains,/value instanceof Date\?value\.toISOString\(\):value/,'history cursors must serialize timestamps as ISO values');
assert.match(maintenancePage,/method:'POST'[\s\S]*DELETE SALES 2026-08/,'maintenance UI must require the exact server confirmation phrase');
console.log('Vibe sales period purge checks passed.');
