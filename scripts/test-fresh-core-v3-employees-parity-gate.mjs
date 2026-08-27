import assert from 'node:assert/strict';
import {evaluateEmployeesDirectoryParityGate,EMPLOYEES_DIRECTORY_PARITY_GATE_POLICY as POLICY} from '../src-v3/domains/employees/parity-gate.js';
import {EMPLOYEES_CONTRACT} from '../src-v3/domains/employees/employees-contract.js';

const pass=evaluateEmployeesDirectoryParityGate({source:'device-local',complete:true,parityReady:true,reads:1,writes:0,durationMs:125,legacyCount:3,cloudCount:3});
assert.equal(pass.pass,true);
assert.equal(pass.unlockControlledShadowReview,true);
assert.equal(pass.activationAllowed,false);
assert.equal(pass.authoritative,false);
assert.equal(pass.autoPromotion,false);

const synthetic=evaluateEmployeesDirectoryParityGate({source:'synthetic',complete:true,parityReady:true,reads:1,writes:0,durationMs:100,legacyCount:3,cloudCount:3});
assert.equal(synthetic.pass,false);
assert.equal(synthetic.realDevice,false);

const seededRequired=evaluateEmployeesDirectoryParityGate({source:'device-local',complete:true,parityReady:false,reads:1,writes:0,durationMs:100,legacyCount:3,cloudCount:0});
assert.equal(seededRequired.pass,false);
assert.equal(seededRequired.cloudSeedRequired,true);
assert.equal(seededRequired.recommendation,'cloud-directory-seed-required-before-parity');

for(const bad of [
  {source:'device-local',complete:false,parityReady:true,reads:1,writes:0,durationMs:100,legacyCount:3,cloudCount:3},
  {source:'device-local',complete:true,parityReady:true,reads:2,writes:0,durationMs:100,legacyCount:3,cloudCount:3},
  {source:'device-local',complete:true,parityReady:true,reads:1,writes:1,durationMs:100,legacyCount:3,cloudCount:3},
  {source:'device-local',complete:true,parityReady:true,reads:1,writes:0,durationMs:6000,legacyCount:3,cloudCount:3},
  {source:'device-local',complete:true,parityReady:true,reads:1,writes:0,durationMs:100,legacyCount:3,cloudCount:2}
])assert.equal(evaluateEmployeesDirectoryParityGate(bad).pass,false);

assert.equal(POLICY.observationsRequired,1);
assert.equal(POLICY.readsPerObservation,1);
assert.equal(POLICY.writesPerObservation,0);
assert.equal(POLICY.syntheticCredit,0);
assert.equal(POLICY.activationAllowed,false);
assert.equal(POLICY.autoPromotion,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.parityGatePrepared,true);
assert.equal(EMPLOYEES_CONTRACT.cloud.productionParityObservations,0);
assert.equal(EMPLOYEES_CONTRACT.cloud.productionParityCreditFromSynthetic,0);
assert.equal(EMPLOYEES_CONTRACT.currentAuthority,'legacy-local');
assert.equal(EMPLOYEES_CONTRACT.productionActivation,false);
console.log('Fresh Core V3-6 employee directory parity gate: PASS');
