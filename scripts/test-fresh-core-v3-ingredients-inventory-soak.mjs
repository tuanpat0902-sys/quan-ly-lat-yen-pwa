import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('ly-fresh-core-v3-ingredients-inventory-soak.js','utf8');
const cost=JSON.parse(fs.readFileSync('src-v3/cost-policy.json','utf8'));
const contract=fs.readFileSync('src-v3/domains/ingredients-inventory/ingredients-inventory-contract.js','utf8');
const repository=fs.readFileSync('src-v3/domains/ingredients-inventory/ingredients-inventory-repository.js','utf8');
const service=fs.readFileSync('src-v3/domains/ingredients-inventory/ingredients-inventory-service.js','utf8');
const loader=fs.readFileSync('ly-module-loader.js','utf8');

assert.equal(cost.policy,'zero-added-cost');
assert.equal(cost.shadowSoak.ingredientsInventoryReadOnly,true);
assert.equal(cost.shadowSoak.ingredientsInventoryMaxRunsPerDevicePerDay,1);
assert.equal(cost.shadowSoak.ingredientsInventoryQueriesPerRun,2);
assert.equal(cost.shadowSoak.ingredientsInventoryMaxRowsPerDataset,500);
assert.equal(cost.shadowSoak.ingredientsInventoryCloudWrites,0);

assert.match(source,/MIN_INTERVAL_MS=24\*60\*60\*1000/);
assert.match(source,/state\.reads\+=2/);
assert.match(source,/state\.writes=0/);
assert.match(source,/localStorage\.setItem/);
assert.match(source,/maxRowsPerDataset:500/);
assert.doesNotMatch(source,/\.rpc\s*\(/);
assert.doesNotMatch(source,/\.insert\s*\(/);
assert.doesNotMatch(source,/\.update\s*\(/);
assert.doesNotMatch(source,/\.upsert\s*\(/);
assert.doesNotMatch(source,/\.delete\s*\(/);
assert.doesNotMatch(source,/fetch\s*\(/);

assert.match(contract,/shadowPageSize:500/);
assert.match(repository,/readControlledShadow/);
assert.match(repository,/page:1,pageSize:C\.shadowPageSize/);
assert.match(service,/refreshControlledShadow/);
assert.match(service,/complete=completeIngredients&&completeInventory/);
assert.match(loader,/freshCoreV3IngredientsInventorySoak/);

console.log('Fresh Core V3-2 controlled production shadow soak: PASS');
