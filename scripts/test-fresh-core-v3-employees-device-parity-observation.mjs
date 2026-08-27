import assert from 'node:assert/strict';
import {
  persistEmployeesDeviceParityObservation,
  readEmployeesDeviceParityObservation,
  EMPLOYEES_DEVICE_PARITY_STORAGE_KEY,
  EMPLOYEES_DEVICE_PARITY_OBSERVATION_POLICY
} from '../src-v3/domains/employees/device-parity-observation.js';

function createStorage(){
  const data=new Map();
  return {
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    dump:key=>data.get(key)
  };
}

const storage=createStorage();
const orgId='33333333-3333-3333-3333-333333333333';
const warehouseId='22222222-2222-2222-2222-222222222222';

const rejected=persistEmployeesDeviceParityObservation({
  storage,orgId,warehouseId,
  observation:{source:'synthetic',complete:true,parityReady:true,reads:1,writes:0,durationMs:120,legacyCount:2,cloudCount:2},
  now:1000
});
assert.equal(rejected.persisted,false);
assert.equal(rejected.gate.pass,false);
assert.equal(storage.getItem(EMPLOYEES_DEVICE_PARITY_STORAGE_KEY),null,'synthetic observation must not be persisted as production evidence');

const failed=persistEmployeesDeviceParityObservation({
  storage,orgId,warehouseId,
  observation:{source:'device-local',complete:true,parityReady:false,reads:1,writes:0,durationMs:125,legacyCount:2,cloudCount:0},
  now:2000
});
assert.equal(failed.persisted,true);
assert.equal(failed.gate.pass,false);
assert.equal(failed.gate.cloudSeedRequired,true);
assert.equal(failed.entry.productionObservationCredit,0);
assert.equal(failed.entry.containsEmployeeRows,false);
assert.equal(failed.entry.cloudWrites,0);
assert.equal(failed.entry.activationAllowed,false);

const passed=persistEmployeesDeviceParityObservation({
  storage,orgId,warehouseId,
  observation:{source:'device-local',complete:true,parityReady:true,reads:1,writes:0,durationMs:130,legacyCount:2,cloudCount:2},
  now:3000
});
assert.equal(passed.persisted,true);
assert.equal(passed.gate.pass,true);
assert.equal(passed.gate.unlockControlledShadowReview,true);
assert.equal(passed.gate.activationAllowed,false);
assert.equal(passed.entry.productionObservationCredit,1);
assert.equal(passed.entry.authoritative,false);
assert.equal(passed.entry.autoPromotion,false);

const entry=readEmployeesDeviceParityObservation({storage,orgId,warehouseId});
assert.equal(entry.lastAt,3000);
assert.equal(entry.observation.source,'device-local');
assert.equal(entry.observation.reads,1);
assert.equal(entry.observation.writes,0);
assert.equal(entry.gate.pass,true);

const raw=storage.dump(EMPLOYEES_DEVICE_PARITY_STORAGE_KEY);
for(const sensitive of ['phone','address','bank_account','id_number','base_salary','hourly_rate','employeeRows','legacyRows','cloudRows']){
  assert.equal(raw.includes(sensitive),false,`persisted observation must not contain ${sensitive}`);
}

assert.deepEqual(EMPLOYEES_DEVICE_PARITY_OBSERVATION_POLICY,{
  storage:'localStorage-only',
  source:'device-local',
  containsEmployeeRows:false,
  cloudReadsAdded:0,
  cloudWrites:0,
  syntheticCredit:0,
  authoritative:false,
  activationAllowed:false,
  autoPromotion:false
});

console.log('Fresh Core V3 employees device parity observation: PASS');
