import assert from 'node:assert/strict';
import fs from 'node:fs';

const shadow=fs.readFileSync('ly-fresh-core-v2-shadow.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const loader=fs.readFileSync('ly-module-loader.js','utf8');

assert.match(shadow,/__lyFreshCoreV2ShadowV6/);
assert.match(shadow,/import\('\.\/src-v2\/bootstrap\.js\?v=20260824\.6'\)/);
assert.match(shadow,/refreshCoreDomains\(\)/);
assert.match(shadow,/preparedItems/);
assert.match(shadow,/resolveContext/);
assert.match(shadow,/__lySupabaseReady/);
for(const forbidden of ['.innerHTML','appendChild(','insertOrg(','updateOrg(','deleteOrg(','domains.ingredients.save','domains.products.save','domains.imports.save','domains.exports.save','domains.stocktake.save','domains.sales.save','domains.cashflow.create'])assert.equal(shadow.includes(forbidden),false,`Shadow runtime must stay read-only/non-DOM: ${forbidden}`);
assert.match(sw,/lat-yen-fresh-core-v2-authoritative-79/);
const runtimeAssets=['./ly-fresh-core-v2-shadow.js','./ly-fresh-core-v2-ingredients-takeover.js','./ly-fresh-core-v2-products-takeover.js','./ly-fresh-core-v2-documents-takeover.js','./ly-fresh-core-v2-sales-takeover.js','./ly-fresh-core-v2-cashflow-takeover.js','./ly-fresh-core-v2-masterdata-takeover.js','./ly-fresh-core-v2-read-takeover.js','./ly-fresh-core-v2-manual-refresh.js','./ly-fresh-core-v2-realtime.js','./ly-fresh-core-v2-realtime-phase2.js'];
for(const asset of [...runtimeAssets,'./src-v2/bootstrap.js','./src-v2/domains/inventory/inventory-repository.js','./src-v2/domains/inventory/inventory-service.js','./src-v2/domains/master-data/master-data-repository.js','./src-v2/domains/master-data/master-data-service.js'])assert.ok(sw.includes(`'${asset}'`),`Service Worker must precache ${asset}`);
for(const name of ['ingredientsTakeover','productsTakeover','documentsTakeover','salesTakeover','cashflowTakeover','masterDataTakeover','readTakeover','manualRefresh','realtime','realtimePhase2','finalOwnership'])assert.ok(loader.includes(`load('${name}')`),`Module loader must activate ${name}`);
assert.match(sw,/function isSupabaseOrigin/);assert.match(sw,/p_type\|\|body\?\.p_kind/);
assert.ok(sw.includes("'ly_inventory','ly_stock_transactions'"),'inventory mutations must be classified for local commit notifications');
console.log('Fresh Core V2 shadow safety contract: PASS');
