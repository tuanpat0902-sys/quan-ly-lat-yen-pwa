import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {SALES_CONTRACT as CONTRACT,SALES_MIGRATION_GUARD as GUARD} from '../src-v3/domains/sales/sales-contract.js';

const baseline=JSON.parse(await fs.readFile(new URL('../src-v3/domains/sales/production-baseline.json',import.meta.url),'utf8'));
const v2Repository=await fs.readFile(new URL('../src-v2/domains/sales/sales-repository.js',import.meta.url),'utf8');
const v2Service=await fs.readFile(new URL('../src-v2/domains/sales/sales-service.js',import.meta.url),'utf8');
const iposSync=await fs.readFile(new URL('../supabase/functions/ly-ipos-sync/index.ts',import.meta.url),'utf8');

assert.equal(CONTRACT.status,'source-of-truth-audited-dependency-ipos-locked');
assert.equal(CONTRACT.currentAuthority,'v2');
assert.equal(CONTRACT.productionActivation,false);
assert.equal(CONTRACT.dualWrite,false);
assert.equal(CONTRACT.cloudReads,0);
assert.equal(CONTRACT.cloudWrites,0);
assert.equal(CONTRACT.repositoryImplemented,false);
assert.equal(CONTRACT.serviceImplemented,false);
assert.equal(CONTRACT.shadowImplemented,false);
assert.deepEqual(CONTRACT.productionBaseline,{sales:226,saleItems:488,iposSales:226,orphanSaleItems:0});
assert.equal(CONTRACT.nextGate,'wait-for-v3-2-v3-3-v3-4-readiness-then-design-read-only-sales-repository');

assert.equal(baseline.tables.ly_sales.rls,true);
assert.equal(baseline.tables.ly_sale_items.rls,true);
assert.equal(baseline.ipos.active,true);
assert.equal(baseline.ipos.cronJob,'ly_ipos_sync_every_minute');
assert.equal(baseline.ipos.cronSchedule,'*/5 0-16,23 * * *');
assert.equal(baseline.ipos.salesWithSourceIpos,226);
assert.equal(baseline.ipos.salesWithIposTranId,226);
assert.equal(baseline.integrity.orphanSaleItems,0);
assert.equal(baseline.runtime.v3RepositoryImplemented,false);
assert.equal(baseline.runtime.productionActivation,false);
assert.equal(baseline.runtime.iposWritePathChanged,false);
assert.equal(baseline.runtime.inventoryDeductionChanged,false);

assert.match(v2Repository,/selectOrg\('ly_sales'/);
assert.match(v2Repository,/selectOrg\('ly_sale_items'/);
assert.match(v2Repository,/gateway\.rpc\('ly_save_sale'/);
assert.match(v2Repository,/gateway\.rpc\('ly_delete_receipt', \{ p_type: 'sale'/);
assert.match(v2Service,/store\.patch\(\{ salesData: value \}/);

assert.match(iposSync,/ly_ipos_upsert_sale/);
assert.match(iposSync,/ly_ipos_delete_sale/);
assert.match(iposSync,/ly_ipos_reconcile_absent_sales/);
assert.match(iposSync,/inventory_changed:false/);

assert.deepEqual(GUARD.requireDependencies,['V3-2','V3-3','V3-4']);
assert.equal(GUARD.requireIposWritePathPreserved,true);
assert.equal(GUARD.allowIposMutationChanges,false);
assert.equal(GUARD.allowInventoryDeductionChanges,false);
assert.equal(GUARD.allowWrites,false);
assert.equal(GUARD.allowDualWrite,false);
assert.equal(GUARD.allowAutoPromotion,false);
assert.equal(GUARD.currentAuthority,'v2');

console.log('Fresh Core V3-5 sales source-of-truth audit: PASS');
