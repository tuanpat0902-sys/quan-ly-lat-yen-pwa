import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {evaluateLegacyRetirementReadiness,LEGACY_RETIREMENT_POLICY as POLICY} from '../src-v3/domains/legacy-retirement/legacy-retirement-readiness.js';

const plan=JSON.parse(await fs.readFile(new URL('../src-v3/migration-plan.json',import.meta.url),'utf8'));
const current=evaluateLegacyRetirementReadiness(plan);

assert.equal(current.ready,false,'current production plan must remain retirement-locked');
assert.equal(current.retirementAllowed,false);
assert.equal(current.legacyRemovalAllowed,false);
assert.equal(current.loaderRemovalAllowed,false);
assert.equal(current.fallbackRemovalAllowed,false);
assert.equal(current.autoRetirement,false);
assert.equal(current.globalSafety,true);
assert.deepEqual(current.blockedWaves,['V3-1','V3-2','V3-3','V3-4','V3-5','V3-6','V3-7','V3-8']);

const syntheticReady=structuredClone(plan);
for(const wave of syntheticReady.waves){
  if(POLICY.requiredWaves.includes(wave.id)){
    wave.authoritative='v3';
    wave.evidence={...(wave.evidence??{}),productionActivation:true,dualWrite:false};
  }
}
const pass=evaluateLegacyRetirementReadiness(syntheticReady);
assert.equal(pass.ready,true);
assert.deepEqual(pass.blockedWaves,[]);
assert.equal(pass.retirementAllowed,true);
assert.equal(pass.legacyRemovalAllowed,true);
assert.equal(pass.loaderRemovalAllowed,true);
assert.equal(pass.fallbackRemovalAllowed,true);
assert.equal(pass.autoRetirement,false);

const dualWrite=structuredClone(syntheticReady);
dualWrite.dualWrite=true;
const dualWriteBlocked=evaluateLegacyRetirementReadiness(dualWrite);
assert.equal(dualWriteBlocked.ready,false);
assert.equal(dualWriteBlocked.globalSafety,false);

const noRollback=structuredClone(syntheticReady);
noRollback.rollback.required=false;
assert.equal(evaluateLegacyRetirementReadiness(noRollback).ready,false);

const missingWave=structuredClone(syntheticReady);
missingWave.waves=missingWave.waves.filter(wave=>wave.id!=='V3-5');
assert.equal(evaluateLegacyRetirementReadiness(missingWave).ready,false);
assert.ok(evaluateLegacyRetirementReadiness(missingWave).blockedWaves.includes('V3-5'));

assert.deepEqual(POLICY.requiredWaves,['V3-1','V3-2','V3-3','V3-4','V3-5','V3-6','V3-7','V3-8']);
assert.equal(POLICY.requiredAuthority,'v3');
assert.equal(POLICY.requireProductionActivation,true);
assert.equal(POLICY.requireGlobalDualWriteDisabled,true);
assert.equal(POLICY.requirePerDomainRollback,true);
assert.equal(POLICY.autoRetirement,false);
assert.equal(POLICY.productionWrites,0);

console.log('Fresh Core V3-9 legacy retirement readiness: PASS (current plan LOCKED as expected)');
