import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {evaluateAcceleratedIngredientsInventoryValidation,INGREDIENTS_INVENTORY_ACCELERATED_POLICY} from '../src-v3/domains/ingredients-inventory/accelerated-validation.js';

const runtime=await fs.readFile(new URL('../ly-fresh-core-v3-ingredients-inventory-validation.js',import.meta.url),'utf8');
const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');
const settings=await fs.readFile(new URL('../ly-settings-enhancements.js',import.meta.url),'utf8');
const cost=JSON.parse(await fs.readFile(new URL('../src-v3/cost-policy.json',import.meta.url),'utf8'));

const observation=(round)=>({round,lastAt:round,durationMs:800,parityReady:true,complete:true,reads:2,writes:0});
const result=evaluateAcceleratedIngredientsInventoryValidation([observation(1),observation(2),observation(3)]);

assert.equal(result.pass,true);
assert.equal(result.advisoryOnly,true);
assert.equal(result.productionObservationCredit,0);
assert.equal(INGREDIENTS_INVENTORY_ACCELERATED_POLICY.totalQueries,6);
assert.equal(INGREDIENTS_INVENTORY_ACCELERATED_POLICY.autoPromotion,false);
assert.equal(cost.technicalValidation.ingredientsInventory.cloudWrites,0);
assert.equal(cost.technicalValidation.ingredientsInventory.productionObservationCredit,0);
assert.equal(cost.technicalValidation.ingredientsInventory.maxSessionsPerDevicePerDay,1);

assert.match(runtime,/ROUNDS=3/);
assert.match(runtime,/COOLDOWN_MS=24\*60\*60\*1000/);
assert.match(runtime,/state\.reads=round\*2/);
assert.match(runtime,/productionObservationCredit:0/);
assert.doesNotMatch(runtime,/\.insert\s*\(/);
assert.doesNotMatch(runtime,/\.update\s*\(/);
assert.doesNotMatch(runtime,/\.upsert\s*\(/);
assert.doesNotMatch(runtime,/\.delete\s*\(/);
assert.doesNotMatch(runtime,/\.rpc\s*\(/);
assert.doesNotMatch(loader,/load\('freshCoreV3IngredientsInventoryValidation'\).*loadBackground/s,'technical validation must not auto-run in the background');
assert.match(settings,/Chạy kiểm tra nhanh V3-2/);
assert.match(settings,/không cộng vào 3 lần production soak/);
console.log('Fresh Core V3-2 bounded technical validation: PASS');
