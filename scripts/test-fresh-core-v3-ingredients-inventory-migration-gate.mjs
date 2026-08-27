import assert from 'node:assert/strict';
import {evaluateIngredientsInventoryMigrationGate,INGREDIENTS_INVENTORY_MIGRATION_GATE} from '../src-v3/domains/ingredients-inventory/migration-gate.js';
import {resolveIngredientsInventoryReadMode,INGREDIENTS_INVENTORY_ROLLBACK} from '../src-v3/domains/ingredients-inventory/rollback-contract.js';

const passObs=at=>({lastAt:at,durationMs:1200,parityReady:true,complete:true,reads:2,writes:0});
const failObs={lastAt:4,durationMs:1200,parityReady:false,complete:true,reads:2,writes:0};

assert.equal(evaluateIngredientsInventoryMigrationGate([passObs(1),passObs(2)]).pass,false,'two observations are insufficient');
const ready=evaluateIngredientsInventoryMigrationGate([passObs(1),passObs(2),passObs(3)]);
assert.equal(ready.pass,true,'three consecutive healthy observations should create a review candidate');
assert.equal(ready.authoritative,false,'gate must never auto-promote authority');
assert.equal(ready.recommendation,'candidate-for-read-authority-review');
assert.equal(evaluateIngredientsInventoryMigrationGate([passObs(1),passObs(2),failObs]).pass,false,'latest failed parity must block candidate');
assert.equal(INGREDIENTS_INVENTORY_MIGRATION_GATE.autoPromotion,false);
assert.equal(INGREDIENTS_INVENTORY_ROLLBACK.defaultMode,'v2');
assert.equal(resolveIngredientsInventoryReadMode({getItem:()=>null}),'v2');
assert.equal(resolveIngredientsInventoryReadMode({getItem:()=> 'v3-candidate'}),'v3-candidate');
console.log('Fresh Core V3-2 migration/rollback gate: PASS');
