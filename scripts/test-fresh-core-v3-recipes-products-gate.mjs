import assert from 'node:assert/strict';
import {
  RECIPES_PRODUCTS_MIGRATION_GATE,
  evaluateRecipesProductsMigrationGate
} from '../src-v3/domains/recipes-products/index.js';

const passObservation=(lastAt)=>({lastAt,parityReady:true,complete:true,writes:0,reads:2,durationMs:1200});
const observations=[passObservation(1),passObservation(2),passObservation(3)];
const readyDependency={pass:true,unlockDependents:true,activationAllowed:false,authoritative:false};

assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.dependency,'V3-2');
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.dependencyContract,'consolidated-readiness');
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.requireDependencyUnlock,true);
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.productionActivation,false);
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.autoPromotion,false);
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.dualWrite,false);

const rawPassMustNotUnlock=evaluateRecipesProductsMigrationGate({dependencyGate:{pass:true},observations});
assert.equal(rawPassMustNotUnlock.ownGatePass,true);
assert.equal(rawPassMustNotUnlock.dependencyPass,false);
assert.equal(rawPassMustNotUnlock.pass,false,'raw V3-2 production gate must not unlock V3-3');
assert.equal(rawPassMustNotUnlock.recommendation,'blocked-by-v3-2-readiness');

const noUnlock=evaluateRecipesProductsMigrationGate({dependencyReadiness:{pass:true,unlockDependents:false},observations});
assert.equal(noUnlock.dependencyPass,false);
assert.equal(noUnlock.pass,false);

const eligible=evaluateRecipesProductsMigrationGate({dependencyReadiness:readyDependency,observations});
assert.equal(eligible.ownGatePass,true);
assert.equal(eligible.dependencyPass,true);
assert.equal(eligible.pass,true);
assert.equal(eligible.activationAllowed,false);
assert.equal(eligible.dependencySource,'v3-2-consolidated-readiness');
assert.equal(eligible.recommendation,'eligible-for-controlled-shadow-review');

const badReads=evaluateRecipesProductsMigrationGate({
  dependencyReadiness:readyDependency,
  observations:[passObservation(1),passObservation(2),{...passObservation(3),reads:1}]
});
assert.equal(badReads.pass,false);
assert.equal(badReads.observedPasses,2);

const slow=evaluateRecipesProductsMigrationGate({
  dependencyReadiness:readyDependency,
  observations:[passObservation(1),passObservation(2),{...passObservation(3),durationMs:5001}]
});
assert.equal(slow.pass,false);

console.log('Fresh Core V3 Recipes / Products consolidated dependency gate: PASS');
