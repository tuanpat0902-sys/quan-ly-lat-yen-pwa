import assert from 'node:assert/strict';
import {resolveIngredientsInventoryCandidate,INGREDIENTS_INVENTORY_READ_CANDIDATE} from '../src-v3/domains/ingredients-inventory/read-authority-candidate.js';
import {createIngredientsInventoryLocalReadinessSnapshot,INGREDIENTS_INVENTORY_LOCAL_READINESS_POLICY} from '../src-v3/domains/ingredients-inventory/local-readiness-snapshot.js';

const storage=value=>({getItem:()=>value});
const passObservation=lastAt=>({lastAt,parityReady:true,complete:true,writes:0,reads:2,durationMs:800});

assert.equal(resolveIngredientsInventoryCandidate({
  storage:storage('v3-candidate'),
  productionGate:{pass:false},
  technicalValidation:{pass:true}
}).mode,'v2','production gate must block V3 candidate');

assert.equal(resolveIngredientsInventoryCandidate({
  storage:storage('v3-candidate'),
  productionGate:{pass:true},
  technicalValidation:{pass:false}
}).mode,'v2','technical validation must block V3 candidate');

const ready=resolveIngredientsInventoryCandidate({
  storage:storage('v3-candidate'),
  productionGate:{pass:true},
  technicalValidation:{pass:true}
});
assert.equal(ready.mode,'v3-candidate');
assert.equal(ready.enabled,true);
assert.equal(ready.authoritative,false,'candidate preparation must not become authoritative');
assert.equal(INGREDIENTS_INVENTORY_READ_CANDIDATE.autoPromotion,false);
assert.equal(INGREDIENTS_INVENTORY_READ_CANDIDATE.dualWrite,false);
assert.equal(INGREDIENTS_INVENTORY_READ_CANDIDATE.defaultAuthority,'v2');

const orgId='org-1';
const production=[passObservation(1),passObservation(2),passObservation(3)];
const technical=[passObservation(11),passObservation(12),passObservation(13)];
const persisted=createIngredientsInventoryLocalReadinessSnapshot({
  orgId,
  soakStored:{orgs:{[orgId]:{lastAt:3,history:production,gate:{pass:true}}}},
  validationStored:{orgs:{[orgId]:{lastAt:13,observations:technical,result:{pass:true}}}}
});
assert.equal(persisted.readiness.pass,true);
assert.equal(persisted.unlockDependents,true);
assert.equal(persisted.productionObservationCount,3);
assert.equal(persisted.technicalObservationCount,3);
assert.equal(persisted.activationAllowed,false);
assert.equal(persisted.authoritative,false);
assert.equal(persisted.source,'localStorage-only');

const technicalOnly=createIngredientsInventoryLocalReadinessSnapshot({
  orgId,
  soakStored:{orgs:{[orgId]:{history:[]}}},
  validationStored:{orgs:{[orgId]:{observations:technical,result:{pass:true}}}}
});
assert.equal(technicalOnly.readiness.pass,false,'technical observations must not replace production soak');
assert.equal(technicalOnly.unlockDependents,false);

const malformed=createIngredientsInventoryLocalReadinessSnapshot({orgId,soakStored:null,validationStored:{orgs:{[orgId]:{observations:'bad'}}}});
assert.equal(malformed.readiness.pass,false);
assert.equal(malformed.productionObservationCount,0);
assert.equal(malformed.technicalObservationCount,0);

assert.equal(INGREDIENTS_INVENTORY_LOCAL_READINESS_POLICY.cloudReads,0);
assert.equal(INGREDIENTS_INVENTORY_LOCAL_READINESS_POLICY.cloudWrites,0);
assert.equal(INGREDIENTS_INVENTORY_LOCAL_READINESS_POLICY.syntheticObservations,false);
assert.equal(INGREDIENTS_INVENTORY_LOCAL_READINESS_POLICY.activationAllowed,false);

console.log('Fresh Core V3-2 read-authority candidate + persisted readiness snapshot: PASS');
