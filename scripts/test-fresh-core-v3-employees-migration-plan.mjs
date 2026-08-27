import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const plan=JSON.parse(await fs.readFile(new URL('../src-v3/migration-plan.json',import.meta.url),'utf8'));
assert.equal(plan.version,'3.0-migration-plan-19');

const wave=plan.waves.find(item=>item.id==='V3-6');
assert.ok(wave,'V3-6 wave must exist');
assert.equal(wave.authoritative,'legacy-local');
assert.equal(wave.status,'manual-device-parity-runner-ready-awaiting-real-observation');

const evidence=wave.evidence;
assert.equal(evidence.productionParityObservations,0,'plan must not invent a production observation');
assert.equal(evidence.cloudWrites,0);
assert.equal(evidence.productionActivation,false);
assert.equal(evidence.dualWrite,false);
assert.equal(evidence.repositoryRuntimeActivated,false);

assert.deepEqual(evidence.manualDeviceParityRunner,{
  implemented:true,
  surface:'settings-explicit-click',
  autoRun:false,
  requiresExplicitUserAction:true,
  readsPerRun:1,
  cloudWritesPerRun:0,
  storage:'localStorage-only',
  containsEmployeeRows:false,
  realDeviceOnly:true,
  syntheticCredit:0,
  seedAllowed:false,
  authorityChange:false,
  activationAllowed:false,
  autoPromotion:false
});

assert.deepEqual(evidence.controlledCloudDirectorySeedReview,{
  eligible:false,
  requiresRealDeviceObservation:true,
  requiresCloudSeedRequired:true,
  autoSeed:false,
  businessDataWriteIncluded:false,
  activationAllowed:false
});

assert.equal(evidence.nextGate,'run-manual-device-parity-on-real-production-device-before-any-seed-or-shadow-review');
console.log('Fresh Core V3 employees migration plan gate: PASS');
