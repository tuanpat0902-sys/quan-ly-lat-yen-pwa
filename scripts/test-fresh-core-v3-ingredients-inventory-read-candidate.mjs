import assert from 'node:assert/strict';
import {resolveIngredientsInventoryCandidate,INGREDIENTS_INVENTORY_READ_CANDIDATE} from '../src-v3/domains/ingredients-inventory/read-authority-candidate.js';

const storage=value=>({getItem:()=>value});

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
console.log('Fresh Core V3-2 read-authority candidate preparation: PASS');
