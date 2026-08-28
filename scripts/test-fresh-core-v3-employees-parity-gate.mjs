import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {evaluateEmployeesDirectoryParityGate,EMPLOYEES_DIRECTORY_PARITY_GATE_POLICY as POLICY} from '../src-v3/domains/employees/parity-gate.js';
import {EMPLOYEES_CONTRACT} from '../src-v3/domains/employees/employees-contract.js';

const plan=JSON.parse(await fs.readFile(new URL('../src-v3/migration-plan.json',import.meta.url),'utf8'));
const wave=plan.waves.find(item=>item.id==='V3-6');

const pass=evaluateEmployeesDirectoryParityGate({source:'device-local',complete:true,parityReady:true,reads:1,writes:0,durationMs:125,legacyCount:3,cloudCount:3});
assert.equal(pass.pass,true);
assert.equal(pass.unlockControlledShadowReview,true);
assert.equal(pass.activationAllowed,false);
assert.equal(pass.authoritative,false);
assert.equal(pass.autoPromotion,false);

const empty=evaluateEmployeesDirectoryParityGate({source:'device-local',complete:true,parityReady:true,reads:1,writes:0,durationMs:100,legacyCount:0,cloudCount:0});
assert.equal(empty.pass,false);
assert.equal(empty.emptyDataset,true);
assert.equal(empty.hasLegacyEvidence,false);
assert.equal(empty.unlockControlledShadowReview,false);
assert.equal(empty.recommendation,'no-legacy-directory-evidence');

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
assert.equal(POLICY.minimumLegacyRows,1);
assert.equal(POLICY.emptyDatasetCredit,0);
assert.equal(POLICY.readsPerObservation,1);
assert.equal(POLICY.writesPerObservation,0);
assert.equal(POLICY.syntheticCredit,0);
assert.equal(POLICY.activationAllowed,false);
assert.equal(POLICY.autoPromotion,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.parityGatePrepared,true);
assert.equal(EMPLOYEES_CONTRACT.cloud.productionParityObservations,1);
assert.equal(EMPLOYEES_CONTRACT.cloud.productionParityCredit,0);
assert.equal(EMPLOYEES_CONTRACT.cloud.productionParityCreditFromSynthetic,0);
assert.equal(EMPLOYEES_CONTRACT.cloud.emptyProductionDomainHold,true);
assert.equal(EMPLOYEES_CONTRACT.currentAuthority,'legacy-local');
assert.equal(EMPLOYEES_CONTRACT.productionActivation,false);
assert.equal(plan.version,'3.0-migration-plan-23');
assert.equal(wave.status,'empty-production-domain-hold');
assert.equal(wave.evidence.repository,'implemented-read-only-safe-rpc');
assert.equal(wave.evidence.repositoryRuntimeActivated,false);
assert.equal(wave.evidence.parityGate.implemented,true);
assert.equal(wave.evidence.parityGate.syntheticCredit,0);
assert.equal(wave.evidence.parityGate.emptyDatasetCredit,0);
assert.equal(wave.evidence.manualDeviceParityRunner.implemented,true);
assert.equal(wave.evidence.manualDeviceParityRunner.requiresExplicitUserAction,true);
assert.equal(wave.evidence.manualDeviceParityRunner.cloudWritesPerRun,0);
assert.equal(wave.evidence.controlledCloudDirectorySeedReview.eligible,false);
assert.equal(wave.evidence.controlledCloudDirectorySeedReview.requiresRealDeviceObservation,true);
assert.equal(wave.evidence.productionParityObservations,1);
assert.equal(wave.evidence.productionParityCredit,0);
assert.equal(wave.evidence.emptyProductionDomainHold.active,true);
assert.equal(wave.evidence.productionActivation,false);
assert.equal(wave.evidence.nextGate,'rerun-real-device-parity-after-first-legacy-employee');
console.log('Fresh Core V3-6 employee directory parity gate: PASS');
