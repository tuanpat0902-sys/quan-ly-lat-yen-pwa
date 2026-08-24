import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFile(new URL(path,root),'utf8');
const exists=async path=>{try{await fs.access(new URL(path,root));return true;}catch{return false;}};

const required=[
 'ly-fresh-core-v2-shadow.js','ly-fresh-core-v2-read-takeover.js','ly-fresh-core-v2-legacy-hydration.js','ly-fresh-core-v2-manual-refresh.js',
 'ly-fresh-core-v2-realtime.js','ly-fresh-core-v2-realtime-phase2.js','ly-fresh-core-v2-ingredients-takeover.js','ly-fresh-core-v2-products-takeover.js',
 'ly-fresh-core-v2-documents-takeover.js','ly-fresh-core-v2-sales-takeover.js','ly-fresh-core-v2-cashflow-takeover.js','ly-fresh-core-v2-masterdata-takeover.js',
 'src-v2/bootstrap.js','src-v2/domains/create-domains.js','src-v2/data/supabase-gateway.js','scripts/legacy-direct-write-guard.mjs'
];
for(const file of required)assert.equal(await exists(file),true,`missing Fresh Core V2 test-candidate file: ${file}`);

const [pkg,sw,loader,readTakeover,hydration,manual,realtime,phase2,domains,writeGuard]=await Promise.all([
 read('package.json'),read('sw.js'),read('ly-module-loader.js'),read('ly-fresh-core-v2-read-takeover.js'),read('ly-fresh-core-v2-legacy-hydration.js'),read('ly-fresh-core-v2-manual-refresh.js'),read('ly-fresh-core-v2-realtime.js'),read('ly-fresh-core-v2-realtime-phase2.js'),read('src-v2/domains/create-domains.js'),read('scripts/legacy-direct-write-guard.mjs')
]);

const coreTables=['ly_warehouses','ly_suppliers','ly_ingredients','ly_prepared_items','ly_products','ly_recipe_items','ly_inventory','ly_import_receipts','ly_import_items','ly_export_receipts','ly_export_items','ly_stocktake_receipts','ly_stocktake_items','ly_sales','ly_sale_items','ly_stock_transactions','ly_cashflow_entries'];
for(const table of coreTables)assert.ok(readTakeover.includes(table),`read takeover missing ${table}`);

for(const token of ['ingredients','products','imports','exports','stocktake','sales','cashflow','inventory','masterData'])assert.ok(domains.includes(token),`domain factory missing ${token}`);
for(const file of ['ly-fresh-core-v2-ingredients-takeover.js','ly-fresh-core-v2-products-takeover.js','ly-fresh-core-v2-documents-takeover.js','ly-fresh-core-v2-sales-takeover.js','ly-fresh-core-v2-cashflow-takeover.js','ly-fresh-core-v2-masterdata-takeover.js','ly-fresh-core-v2-read-takeover.js','ly-fresh-core-v2-realtime.js','ly-fresh-core-v2-realtime-phase2.js'])assert.ok(sw.includes(file),`service worker missing runtime injection/precache contract for ${file}`);

assert.ok(readTakeover.includes('foregroundFastPaths'),'foreground fast-path telemetry missing');
assert.ok(readTakeover.includes('hydrateFromCore'),'shared hydration wiring missing');
assert.ok(hydration.includes('__lyFreshCoreV2LegacyHydration'),'Legacy hydration API missing');
assert.ok(loader.includes("manualRefresh:{src:'./ly-fresh-core-v2-manual-refresh.js")&&loader.includes("await load('manualRefresh')"),'manual refresh coordinator is not chained from the module loader');
assert.ok(manual.includes('autoSyncNow'),'manual user refresh hook missing');
assert.ok(manual.includes('refreshCoreDomains'),'manual refresh is not authoritative V2 refresh');
assert.ok(realtime.includes('refreshCoreDomains')&&realtime.toLowerCase().includes('catchup'),'realtime reconnect catch-up missing');
assert.ok(phase2.includes('__lyFreshRealtime'),'Legacy realtime retirement/fallback contract missing');
assert.ok(writeGuard.includes('PASS')||writeGuard.includes('direct-write'),'Legacy direct-write guard missing');

for(const script of ['v2:takeover:ingredients','v2:takeover:products','v2:takeover:documents','v2:takeover:sales','v2:takeover:cashflow','v2:takeover:masterdata','v2:takeover:reads','v2:legacy-hydration','v2:resume-refresh','v2:manual-refresh','v2:realtime','v2:realtime:phase2','v2:readiness'])assert.ok(pkg.includes(`\"${script}\"`),`package gate missing ${script}`);
assert.ok(pkg.includes('legacy:write-guard'),'write guard is not part of package gates');

console.log(`Fresh Core V2 TEST CANDIDATE readiness: PASS (${coreTables.length} core tables, domain/write/read/realtime/fallback gates present)`);
