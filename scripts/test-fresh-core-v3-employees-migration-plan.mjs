import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const plan=JSON.parse(await fs.readFile(new URL('../src-v3/migration-plan.json',import.meta.url),'utf8'));
assert.equal(plan.version,'3.0-migration-plan-22');

const wave=plan.waves.find(item=>item.id==='V3-6');
assert.ok(wave,'V3-6 wave must exist');
assert.equal(wave.authoritative,'legacy-local');
assert.equal(wave.status,'empty-production-domain-hold');

const evidence=wave.evidence;
assert.equal(evidence.productionParityObservations,1,'plan must record the real-device observation that established the empty domain');
assert.equal(evidence.productionParityCredit,0,'empty 0/0 observation must receive zero migration credit');
assert.equal(evidence.productionParityLastResult,'empty-dataset-no-evidence');
assert.equal(evidence.cloudWrites,0);
assert.equal(evidence.productionActivation,false);
assert.equal(evidence.dualWrite,false);
assert.equal(evidence.repositoryRuntimeActivated,false);

assert.equal(evidence.emptyProductionDomainHold.active,true);
assert.equal(evidence.emptyProductionDomainHold.verifiedFromRealDevice,true);
assert.equal(evidence.emptyProductionDomainHold.legacyCount,0);
assert.equal(evidence.emptyProductionDomainHold.cloudCount,0);
assert.equal(evidence.emptyProductionDomainHold.productionObservationCredit,0);
assert.equal(evidence.emptyProductionDomainHold.seedRequired,false);
assert.equal(evidence.emptyProductionDomainHold.seedAllowed,false);
assert.equal(evidence.emptyProductionDomainHold.cloudWrites,0);
assert.equal(evidence.emptyProductionDomainHold.resumeWhen,'legacy-employee-count-positive');

assert.equal(evidence.manualDeviceParityRunner.implemented,true);
assert.equal(evidence.manualDeviceParityRunner.autoRun,false);
assert.equal(evidence.manualDeviceParityRunner.readsPerRun,1);
assert.equal(evidence.manualDeviceParityRunner.cloudWritesPerRun,0);
assert.equal(evidence.manualDeviceParityRunner.emptyDatasetCredit,0);
assert.equal(evidence.manualDeviceParityRunner.seedAllowed,false);
assert.equal(evidence.manualDeviceParityRunner.activationAllowed,false);
assert.equal(evidence.manualDeviceParityRunner.autoPromotion,false);

assert.equal(evidence.controlledCloudDirectorySeedReview.eligible,false);
assert.equal(evidence.controlledCloudDirectorySeedReview.autoSeed,false);
assert.equal(evidence.controlledCloudDirectorySeedReview.businessDataWriteIncluded,false);
assert.equal(evidence.controlledCloudDirectorySeedReview.activationAllowed,false);

assert.equal(evidence.nextGate,'rerun-real-device-parity-after-first-legacy-employee');
console.log('Fresh Core V3 employees migration plan gate: PASS');
