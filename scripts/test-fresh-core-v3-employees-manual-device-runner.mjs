import assert from 'node:assert/strict';
import {runEmployeesManualDeviceParity,EMPLOYEES_MANUAL_DEVICE_PARITY_POLICY} from '../src-v3/domains/employees/manual-device-parity.js';
import {EMPLOYEES_DEVICE_PARITY_STORAGE_KEY} from '../src-v3/domains/employees/device-parity-observation.js';

function storage(){
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),raw:key=>values.get(key)||''};
}

const orgId='33333333-3333-3333-3333-333333333333';
const warehouseId='22222222-2222-2222-2222-222222222222';
const legacy=[{id:'legacy-1',warehouse_id:warehouseId,code:'NV01',name:'Nhân viên 01',role:'barista',shift:'full',attendance_mode:'day',active:true,phone:'0900000000',bank_account:'secret',base_salary:999999}];
const cloud=[{id:'11111111-1111-1111-1111-111111111111',warehouse_id:warehouseId,code:'NV01',name:'Nhân viên 01',role:'barista',shift:'full',attendance_mode:'day',active:true}];

{
  let reads=0;
  const store=storage();
  await assert.rejects(()=>runEmployeesManualDeviceParity({source:{listDirectory:async()=>{reads++;return cloud;}},legacyRows:null,orgId,warehouseId,storage:store}),/legacyRows are required/);
  assert.equal(reads,0,'invalid device context must abort before cloud read');
  assert.equal(store.getItem(EMPLOYEES_DEVICE_PARITY_STORAGE_KEY),null);
}

{
  let reads=0;
  const store=storage();
  const result=await runEmployeesManualDeviceParity({
    source:{listDirectory:async args=>{reads++;assert.deepEqual(args,{orgId,warehouseId});return cloud;}},
    legacyRows:legacy,orgId,warehouseId,storage:store,now:12345
  });
  assert.equal(reads,1,'manual device run must perform exactly one safe cloud read');
  assert.equal(result.reads,1);
  assert.equal(result.writes,0);
  assert.equal(result.gate.pass,true);
  assert.equal(result.gate.hasLegacyEvidence,true);
  assert.equal(result.gate.unlockControlledShadowReview,true);
  assert.equal(result.authoritative,false);
  assert.equal(result.activationAllowed,false);
  assert.equal(result.autoPromotion,false);
  const raw=store.raw(EMPLOYEES_DEVICE_PARITY_STORAGE_KEY);
  for(const sensitive of ['Nhân viên 01','0900000000','secret','999999','phone','bank_account','base_salary','employeeRows','legacyRows','cloudRows']){
    assert.equal(raw.includes(sensitive),false,`device evidence must not persist ${sensitive}`);
  }
}

{
  let reads=0;
  const store=storage();
  const result=await runEmployeesManualDeviceParity({
    source:{listDirectory:async()=>{reads++;return [];}},legacyRows:legacy,orgId,warehouseId,storage:store,now:23456
  });
  assert.equal(reads,1);
  assert.equal(result.gate.pass,false);
  assert.equal(result.gate.cloudSeedRequired,true);
  assert.equal(result.gate.recommendation,'cloud-directory-seed-required-before-parity');
  assert.equal(result.writes,0);
}

{
  let reads=0;
  const store=storage();
  const result=await runEmployeesManualDeviceParity({
    source:{listDirectory:async()=>{reads++;return [];}},legacyRows:[],orgId,warehouseId,storage:store,now:34567
  });
  assert.equal(reads,1);
  assert.equal(result.gate.pass,false,'empty 0/0 must not unlock migration review');
  assert.equal(result.gate.emptyDataset,true);
  assert.equal(result.gate.hasLegacyEvidence,false);
  assert.equal(result.gate.unlockControlledShadowReview,false);
  assert.equal(result.gate.recommendation,'no-legacy-directory-evidence');
  const saved=JSON.parse(store.raw(EMPLOYEES_DEVICE_PARITY_STORAGE_KEY));
  const entry=saved.orgs[orgId].warehouses[warehouseId];
  assert.equal(entry.productionObservationCredit,0);
}

assert.deepEqual(EMPLOYEES_MANUAL_DEVICE_PARITY_POLICY,{
  manualOnly:true,cloudReadsPerRun:1,cloudWritesPerRun:0,storage:'localStorage-only',source:'device-local',containsEmployeeRows:false,
  authoritative:false,activationAllowed:false,autoPromotion:false
});

console.log('Fresh Core V3 employees manual device runner: PASS');
