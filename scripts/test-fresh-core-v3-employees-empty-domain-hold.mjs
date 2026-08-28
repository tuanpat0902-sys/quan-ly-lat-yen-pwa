import assert from 'node:assert/strict';
import {evaluateEmployeesEmptyDomainHold,EMPLOYEES_EMPTY_DOMAIN_HOLD as HOLD} from '../src-v3/domains/employees/empty-domain-hold.js';
import {EMPLOYEES_CONTRACT} from '../src-v3/domains/employees/employees-contract.js';

const empty=evaluateEmployeesEmptyDomainHold({legacyCount:0,cloudCount:0});
assert.equal(empty.hold,true);
assert.equal(empty.productionObservationCredit,0);
assert.equal(empty.seedAllowed,false);
assert.equal(empty.writesAllowed,false);
assert.equal(empty.cloudWrites,0);
assert.equal(empty.productionActivation,false);
assert.equal(empty.authoritative,false);
assert.equal(empty.currentAuthority,'legacy-local');
assert.equal(empty.recommendation,'hold-until-first-legacy-employee-then-rerun-device-parity');

for(const nonEmpty of [{legacyCount:1,cloudCount:0},{legacyCount:1,cloudCount:1},{legacyCount:0,cloudCount:1}]){
  const result=evaluateEmployeesEmptyDomainHold(nonEmpty);
  assert.equal(result.hold,false);
  assert.equal(result.seedAllowed,false);
  assert.equal(result.writesAllowed,false);
  assert.equal(result.productionActivation,false);
}

assert.equal(HOLD.status,'empty-production-domain-hold');
assert.equal(HOLD.emptyDatasetCredit,0);
assert.equal(HOLD.seedAllowed,false);
assert.equal(HOLD.autoSeed,false);
assert.equal(HOLD.autoPromotion,false);
assert.equal(HOLD.nextGate,'rerun-real-device-parity-after-first-legacy-employee');

assert.equal(EMPLOYEES_CONTRACT.status,'empty-production-domain-hold');
assert.equal(EMPLOYEES_CONTRACT.currentAuthority,'legacy-local');
assert.equal(EMPLOYEES_CONTRACT.productionActivation,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.emptyProductionDomainHold,true);
assert.equal(EMPLOYEES_CONTRACT.cloud.productionParityObservations,1);
assert.equal(EMPLOYEES_CONTRACT.cloud.productionParityCredit,0);
assert.equal(EMPLOYEES_CONTRACT.cloud.productionParityLegacyCount,0);
assert.equal(EMPLOYEES_CONTRACT.cloud.productionParityCloudCount,0);
assert.equal(EMPLOYEES_CONTRACT.nextGate,'rerun-real-device-parity-after-first-legacy-employee');

console.log('Fresh Core V3 employees empty production domain hold: PASS');
