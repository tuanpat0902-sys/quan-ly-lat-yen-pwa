import assert from 'node:assert/strict';
import {
  RECIPES_PRODUCTS_MIGRATION_GATE,
  evaluateRecipesProductsMigrationGate
} from '../src-v3/domains/recipes-products/index.js';

const passObservation=(lastAt)=>({lastAt,parityReady:true,complete:true,writes:0,reads:2,durationMs:1200});
const observations=[passObservation(1),passObservation(2),passObservation(3)];

assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.dependency,'V3-2');
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.productionActivation,false);
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.autoPromotion,false);
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.dualWrite,false);

const blocked=evaluateRecipesProductsMigrationGate({dependencyGate:{pass:false},observations});
assert.equal(blocked.ownGatePass,true);
assert.equal(blocked.dependencyPass,false);
assert.equal(blocked.pass,false);
assert.equal(blocked.activationAllowed,false);
assert.equal(blocked.recommendation,'blocked-by-v3-2');

const eligible=evaluateRecipesProductsMigrationGate({dependencyGate:{pass:true},observations});
assert.equal(eligible.ownGatePass,true);
assert.equal(eligible.dependencyPass,true);
assert.equal(eligible.pass,true);
assert.equal(eligible.activationAllowed,false);
assert.equal(eligible.recommendation,'eligible-for-controlled-shadow-review');

const badReads=evaluateRecipesProductsMigrationGate({
  dependencyGate:{pass:true},
  observations:[passObservation(1),passObservation(2),{...passObservation(3),reads:1}]
});
assert.equal(badReads.pass,false);
assert.equal(badReads.observedPasses,2);

const slow=evaluateRecipesProductsMigrationGate({
  dependencyGate:{pass:true},
  observations:[passObservation(1),passObservation(2),{...passObservation(3),durationMs:5001}]
});
assert.equal(slow.pass,false);

console.log('Fresh Core V3 Recipes / Products dependency gate: PASS');
