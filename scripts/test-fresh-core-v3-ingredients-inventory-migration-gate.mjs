import assert from 'node:assert/strict';
import {evaluateIngredientsInventoryMigrationGate,INGREDIENTS_INVENTORY_MIGRATION_GATE} from '../src-v3/domains/ingredients-inventory/migration-gate.js';
import {resolveIngredientsInventoryReadMode,INGREDIENTS_INVENTORY_ROLLBACK} from '../src-v3/domains/ingredients-inventory/rollback-contract.js';

const DAY=24*60*60*1000;
const passObs=at=>({lastAt:at,durationMs:1200,parityReady:true,complete:true,reads:2,writes:0,source:'device-local-production-soak'});
const failObs={lastAt:4*DAY,durationMs:1200,parityReady:false,complete:true,reads:2,writes:0,source:'device-local-production-soak'};

assert.equal(evaluateIngredientsInventoryMigrationGate([passObs(DAY),passObs(2*DAY)]).pass,false,'two observations are insufficient');
const ready=evaluateIngredientsInventoryMigrationGate([passObs(DAY),passObs(2*DAY),passObs(3*DAY)]);
assert.equal(ready.pass,true,'three healthy observations separated by 24h should create a review candidate');
assert.equal(ready.observedPasses,3);
assert.equal(ready.temporalIntegrity,true);
assert.equal(ready.authoritative,false,'gate must never auto-promote authority');
assert.equal(ready.recommendation,'candidate-for-read-authority-review');

const duplicateDay=evaluateIngredientsInventoryMigrationGate([passObs(DAY),passObs(2*DAY),passObs(2*DAY+1000)]);
assert.equal(duplicateDay.pass,false,'duplicate/same-day history must never satisfy production soak');
assert.equal(duplicateDay.temporalIntegrity,false);
assert.equal(duplicateDay.observedPasses,1,'only the latest independently-spaced pass receives consecutive credit');

const tooSoon=evaluateIngredientsInventoryMigrationGate([passObs(DAY),passObs(2*DAY),passObs(3*DAY-1)]);
assert.equal(tooSoon.pass,false,'an observation even 1ms short of the 24h interval must not receive production credit');
assert.equal(tooSoon.temporalIntegrity,false);

const legacyV1=evaluateIngredientsInventoryMigrationGate([
  {lastAt:DAY,durationMs:1200,parityReady:true,complete:true,reads:2,writes:0},
  passObs(2*DAY),
  passObs(3*DAY)
]);
assert.equal(legacyV1.pass,true,'existing genuine soak-v1 observation must remain creditable after the integrity upgrade');

const synthetic=evaluateIngredientsInventoryMigrationGate([
  passObs(DAY),
  passObs(2*DAY),
  {...passObs(3*DAY),source:'synthetic'}
]);
assert.equal(synthetic.pass,false,'synthetic observations must not receive production credit');
assert.equal(synthetic.observedPasses,0);

assert.equal(evaluateIngredientsInventoryMigrationGate([passObs(DAY),passObs(2*DAY),failObs]).pass,false,'latest failed parity must block candidate');
assert.equal(INGREDIENTS_INVENTORY_MIGRATION_GATE.minObservationIntervalMs,DAY);
assert.equal(INGREDIENTS_INVENTORY_MIGRATION_GATE.productionSource,'device-local-production-soak');
assert.equal(INGREDIENTS_INVENTORY_MIGRATION_GATE.autoPromotion,false);
assert.equal(INGREDIENTS_INVENTORY_ROLLBACK.defaultMode,'v2');
assert.equal(resolveIngredientsInventoryReadMode({getItem:()=>null}),'v2');
assert.equal(resolveIngredientsInventoryReadMode({getItem:()=> 'v3-candidate'}),'v3-candidate');
console.log('Fresh Core V3-2 migration/rollback gate: PASS');
