import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DOCUMENTS_CONTRACT as CONTRACT,DOCUMENTS_MIGRATION_GUARD as GUARD} from '../src-v3/domains/documents/documents-contract.js';

const baseline=JSON.parse(await fs.readFile(new URL('../src-v3/domains/documents/production-baseline.json',import.meta.url),'utf8'));
const v2Factory=await fs.readFile(new URL('../src-v2/domains/create-domains.js',import.meta.url),'utf8');
const v2Repository=await fs.readFile(new URL('../src-v2/domains/documents/document-repository.js',import.meta.url),'utf8');

assert.equal(CONTRACT.status,'source-of-truth-audited-dependency-locked');
assert.equal(CONTRACT.currentAuthority,'v2');
assert.equal(CONTRACT.productionActivation,false);
assert.equal(CONTRACT.dualWrite,false);
assert.equal(CONTRACT.cloudWrites,0);
assert.equal(CONTRACT.repositoryImplemented,false);
assert.equal(CONTRACT.serviceImplemented,false);
assert.equal(CONTRACT.shadowImplemented,false);
assert.equal(CONTRACT.nextGate,'wait-for-v3-2-readiness-then-design-read-only-documents-repository');

assert.deepEqual(CONTRACT.productionBaseline,{importReceipts:2,importItems:2,exportReceipts:0,exportItems:0,stocktakeReceipts:0,stocktakeItems:0});
assert.equal(baseline.runtime.v3RepositoryImplemented,false);
assert.equal(baseline.runtime.productionActivation,false);
assert.equal(baseline.runtime.dualWrite,false);
for(const value of Object.values(baseline.tables))assert.equal(value.rls,true);

for(const [name,receiptTable,itemTable,rpcName,deleteType] of [
  ['imports','ly_import_receipts','ly_import_items','ly_save_import','import'],
  ['exports','ly_export_receipts','ly_export_items','ly_save_export','export'],
  ['stocktake','ly_stocktake_receipts','ly_stocktake_items','ly_save_stocktake','stocktake']
]){
  assert.equal(CONTRACT.documents[name].receiptTable,receiptTable);
  assert.equal(CONTRACT.documents[name].itemTable,itemTable);
  assert.equal(CONTRACT.documents[name].saveRpc,rpcName);
  assert.equal(CONTRACT.documents[name].deleteType,deleteType);
  assert.match(v2Factory,new RegExp(`receiptTable: '${receiptTable}'.*itemTable: '${itemTable}'.*rpcName: '${rpcName}'.*deleteType: '${deleteType}'`));
}
assert.match(v2Repository,/gateway\.selectOrg\(receiptTable/);
assert.match(v2Repository,/gateway\.selectOrg\(itemTable/);
assert.match(v2Repository,/gateway\.rpc\(rpcName/);
assert.match(v2Repository,/ly_delete_receipt/);

assert.equal(GUARD.requireV3_2Readiness,true);
assert.equal(GUARD.allowWrites,false);
assert.equal(GUARD.allowDualWrite,false);
assert.equal(GUARD.allowAutoPromotion,false);
assert.equal(GUARD.currentAuthority,'v2');

console.log('Fresh Core V3-4 documents source-of-truth audit: PASS');
