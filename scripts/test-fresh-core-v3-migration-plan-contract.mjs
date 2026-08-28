import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const plan=JSON.parse(await fs.readFile(new URL('../src-v3/migration-plan.json',import.meta.url),'utf8'));

assert.match(plan.version,/^3\.0-migration-plan-\d+$/,'migration plan version must follow the plan-N contract');
assert.equal(plan.productionMode,'v3-shell-authoritative');
assert.equal(plan.v3Mode,'authoritative-shell-with-v2-business-compatibility');
assert.equal(plan.dualWrite,false,'global dual-write must remain disabled');
assert.equal(plan.zeroAddedCost,true);
assert.equal(plan.navigationAuthority,'v3');
assert.equal(plan.rollback?.required,true,'per-domain rollback must remain required');
assert.equal(plan.rollback?.scope,'per-domain');

assert.ok(Array.isArray(plan.waves),'waves must be an array');
const expectedIds=Array.from({length:10},(_,index)=>`V3-${index}`);
const actualIds=plan.waves.map(wave=>wave.id);
assert.deepEqual(actualIds,expectedIds,'migration plan must keep exactly V3-0 through V3-9 in order');
assert.equal(new Set(actualIds).size,actualIds.length,'wave ids must be unique');

const known=new Set(actualIds);
for(const wave of plan.waves){
  assert.equal(typeof wave.name,'string');
  assert.ok(wave.name.length>0,`${wave.id} must have a name`);
  assert.equal(typeof wave.status,'string');
  assert.ok(wave.status.length>0,`${wave.id} must have a status`);
  assert.equal(typeof wave.authoritative,'string');
  for(const dependency of wave.dependsOn??[]){
    assert.ok(known.has(dependency),`${wave.id} dependency ${dependency} must exist`);
    assert.notEqual(dependency,wave.id,`${wave.id} cannot depend on itself`);
  }
}

assert.deepEqual(plan.domainGate,['contract','repository','service','parity','performance','smoke','rollback','production-soak']);

const v39=plan.waves.find(wave=>wave.id==='V3-9');
assert.deepEqual(v39.dependsOn,['V3-1','V3-2','V3-3','V3-4','V3-5','V3-6','V3-7','V3-8']);
assert.notEqual(v39.status,'completed','legacy retirement must not be completed while upstream production gates remain open');

console.log(`Fresh Core V3 migration plan contract: PASS (${plan.version})`);
