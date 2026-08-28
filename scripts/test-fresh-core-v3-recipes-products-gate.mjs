import assert from 'node:assert/strict';
import {
  RECIPES_PRODUCTS_MIGRATION_GATE,
  RECIPES_PRODUCTS_CONTROLLED_ACTIVATION_REVIEW,
  evaluateRecipesProductsMigrationGate,
  evaluateRecipesProductsControlledActivationReview
} from '../src-v3/domains/recipes-products/index.js';

const DAY=24*60*60*1000;
const passObservation=(lastAt)=>({lastAt,parityReady:true,complete:true,writes:0,reads:2,durationMs:1200,source:'device-local-production-soak'});
const observations=[passObservation(DAY),passObservation(2*DAY),passObservation(3*DAY)];
const readyDependency={pass:true,unlockDependents:true,activationAllowed:false,authoritative:false};

assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.dependency,'V3-2');
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.dependencyContract,'consolidated-readiness');
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.requireDependencyUnlock,true);
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.productionActivation,false);
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.autoPromotion,false);
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.dualWrite,false);
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.minObservationIntervalMs,DAY);
assert.equal(RECIPES_PRODUCTS_MIGRATION_GATE.productionSource,'device-local-production-soak');

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
assert.equal(eligible.temporalIntegrity,true);
assert.equal(eligible.activationAllowed,false);
assert.equal(eligible.dependencySource,'v3-2-consolidated-readiness');
assert.equal(eligible.recommendation,'eligible-for-controlled-shadow-review');

const duplicate=evaluateRecipesProductsMigrationGate({
  dependencyReadiness:readyDependency,
  observations:[passObservation(DAY),passObservation(2*DAY),passObservation(2*DAY+1000)]
});
assert.equal(duplicate.pass,false,'same-day V3-3 observations must not receive production credit');
assert.equal(duplicate.temporalIntegrity,false);

const synthetic=evaluateRecipesProductsMigrationGate({
  dependencyReadiness:readyDependency,
  observations:[passObservation(DAY),passObservation(2*DAY),{...passObservation(3*DAY),source:'synthetic'}]
});
assert.equal(synthetic.pass,false,'synthetic V3-3 observations must fail closed');

const badReads=evaluateRecipesProductsMigrationGate({
  dependencyReadiness:readyDependency,
  observations:[passObservation(DAY),passObservation(2*DAY),{...passObservation(3*DAY),reads:1}]
});
assert.equal(badReads.pass,false);
assert.equal(badReads.observedPasses,0);

const slow=evaluateRecipesProductsMigrationGate({
  dependencyReadiness:readyDependency,
  observations:[passObservation(DAY),passObservation(2*DAY),{...passObservation(3*DAY),durationMs:5001}]
});
assert.equal(slow.pass,false);

assert.equal(RECIPES_PRODUCTS_CONTROLLED_ACTIVATION_REVIEW.activationAllowed,false);
assert.equal(RECIPES_PRODUCTS_CONTROLLED_ACTIVATION_REVIEW.autoActivation,false);
assert.equal(RECIPES_PRODUCTS_CONTROLLED_ACTIVATION_REVIEW.protectRecipeItems,true);
assert.equal(RECIPES_PRODUCTS_CONTROLLED_ACTIVATION_REVIEW.inventoryDeductionChanges,false);

const safeReview=evaluateRecipesProductsControlledActivationReview({
  dependencyReadiness:readyDependency,
  migrationGate:eligible,
  safety:{cloudWrites:0,dualWrite:false,recipeItemsProtected:true,inventoryDeductionUnchanged:true}
});
assert.equal(safeReview.reviewEligible,true);
assert.equal(safeReview.activationAllowed,false,'review eligibility must never activate V3-3');
assert.equal(safeReview.authoritative,false);
assert.equal(safeReview.recommendation,'manual-controlled-shadow-activation-review');

const recipeWriteRisk=evaluateRecipesProductsControlledActivationReview({
  dependencyReadiness:readyDependency,
  migrationGate:eligible,
  safety:{cloudWrites:0,dualWrite:false,recipeItemsProtected:false,inventoryDeductionUnchanged:true}
});
assert.equal(recipeWriteRisk.reviewEligible,false,'ly_recipe_items protection is mandatory');

const inventoryRisk=evaluateRecipesProductsControlledActivationReview({
  dependencyReadiness:readyDependency,
  migrationGate:eligible,
  safety:{cloudWrites:0,dualWrite:false,recipeItemsProtected:true,inventoryDeductionUnchanged:false}
});
assert.equal(inventoryRisk.reviewEligible,false,'inventory deduction changes must block V3-3 review');

console.log('Fresh Core V3 Recipes / Products consolidated dependency + controlled review gate: PASS');
