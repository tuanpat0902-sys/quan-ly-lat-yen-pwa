import assert from 'node:assert/strict';
import fs from 'node:fs';

const shadow=fs.readFileSync('ly-fresh-core-v2-shadow.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

assert.match(shadow,/__lyFreshCoreV2ShadowV2/);
assert.match(shadow,/import\('\.\/src-v2\/bootstrap\.js\?v=20260823\.2'\)/);
assert.match(shadow,/refreshCoreDomains\(\)/);
assert.match(shadow,/preparedItems/);
assert.match(shadow,/requestIdleCallback/);
assert.match(shadow,/document\.hidden/);
assert.match(shadow,/navigator\.onLine/);

for(const forbidden of ['.innerHTML','appendChild(','insertOrg(','updateOrg(','deleteOrg(','domains.ingredients.save','domains.products.save','domains.imports.save','domains.exports.save','domains.stocktake.save','domains.sales.save','domains.cashflow.create']){
  assert.equal(shadow.includes(forbidden),false,`Shadow runtime must stay read-only/non-DOM: ${forbidden}`);
}

assert.match(sw,/lat-yen-legacy-ui-fresh-core-48/);
assert.match(sw,/ly-fresh-core-v2-shadow\.js\?v=20260823\.2/);
assert.match(sw,/ly-fresh-core-v2-ingredients-takeover\.js\?v=20260823\.1/);
assert.match(sw,/ly-fresh-core-v2-products-takeover\.js\?v=20260823\.1/);
assert.match(sw,/ly-fresh-core-v2-documents-takeover\.js\?v=20260823\.1/);
assert.match(sw,/ly-fresh-core-v2-sales-takeover\.js\?v=20260823\.1/);
assert.match(sw,/ly-fresh-core-v2-cashflow-takeover\.js\?v=20260823\.1/);
assert.match(sw,/ly-fresh-core-v2-masterdata-takeover\.js\?v=20260823\.2/);
assert.match(sw,/ly-fresh-core-v2-realtime\.js\?v=20260823\.4/);
assert.match(sw,/ly-fresh-core-v2-realtime-phase2\.js\?v=20260823\.1/);
assert.match(sw,/V2_ASSETS/);
for(const asset of [
  './src-v2/bootstrap.js',
  './src-v2/domains/inventory/inventory-repository.js',
  './src-v2/domains/inventory/inventory-service.js',
  './src-v2/domains/master-data/master-data-repository.js',
  './src-v2/domains/master-data/master-data-service.js'
])assert.ok(sw.includes(`'${asset}'`),`Core-48 must precache ${asset}`);
assert.match(sw,/V2_MASTERDATA_TAKEOVER_SCRIPT/);
assert.match(sw,/p_type\|\|body\?\.p_kind/);
assert.ok(sw.includes("'ly_inventory','ly_stock_transactions'"),'inventory mutations must be classified for local commit notifications');

console.log('Fresh Core V2 shadow safety contract: PASS');
