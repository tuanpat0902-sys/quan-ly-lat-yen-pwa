import assert from 'node:assert/strict';
import {
  INGREDIENTS_INVENTORY_READINESS_POLICY,
  evaluateIngredientsInventoryReadiness
} from '../src-v3/domains/ingredients-inventory/index.js';

const passObservation=(lastAt)=>({lastAt,parityReady:true,complete:true,writes:0,reads:2,durationMs:800});
const production=[passObservation(1),passObservation(2),passObservation(3)];
const technical=[passObservation(11),passObservation(12),passObservation(13)];

assert.equal(INGREDIENTS_INVENTORY_READINESS_POLICY.productionPassesRequired,3);
assert.equal(INGREDIENTS_INVENTORY_READINESS_POLICY.technicalRoundsRequired,3);
assert.equal(INGREDIENTS_INVENTORY_READINESS_POLICY.technicalProductionObservationCredit,0);
assert.equal(INGREDIENTS_INVENTORY_READINESS_POLICY.activationAllowed,false);
assert.equal(INGREDIENTS_INVENTORY_READINESS_POLICY.autoPromotion,false);

const ready=evaluateIngredientsInventoryReadiness({productionObservations:production,technicalObservations:technical});
assert.equal(ready.productionReady,true);
assert.equal(ready.technicalReady,true);
assert.equal(ready.pass,true);
assert.equal(ready.unlockDependents,true);
assert.equal(ready.activationAllowed,false);
assert.equal(ready.authoritative,false);

const technicalOnly=evaluateIngredientsInventoryReadiness({productionObservations:[],technicalObservations:technical});
assert.equal(technicalOnly.productionReady,false);
assert.equal(technicalOnly.technicalReady,true);
assert.equal(technicalOnly.pass,false,'technical rounds must never replace production observations');
assert.equal(technicalOnly.unlockDependents,false);
assert.equal(technicalOnly.recommendation,'continue-production-soak');

const productionOnly=evaluateIngredientsInventoryReadiness({productionObservations:production,technicalObservations:[]});
assert.equal(productionOnly.productionReady,true);
assert.equal(productionOnly.technicalReady,false);
assert.equal(productionOnly.pass,false);
assert.equal(productionOnly.unlockDependents,false);
assert.equal(productionOnly.recommendation,'run-or-pass-technical-validation');

const incompleteProduction=[passObservation(1),passObservation(2),{...passObservation(3),complete:false}];
const blocked=evaluateIngredientsInventoryReadiness({productionObservations:incompleteProduction,technicalObservations:technical});
assert.equal(blocked.pass,false);
assert.equal(blocked.unlockDependents,false);

console.log('Fresh Core V3-2 consolidated readiness gate: PASS');
