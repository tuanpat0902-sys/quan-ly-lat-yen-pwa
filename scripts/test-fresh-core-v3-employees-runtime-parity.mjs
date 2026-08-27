import assert from 'node:assert/strict';
import {createFreshCoreV3} from '../src-v3/app/bootstrap.js';
import {evaluateEmployeesDirectoryParityGate} from '../src-v3/domains/employees/parity-gate.js';

const calls=[];
const employee={
  id:'11111111-1111-1111-1111-111111111111',
  warehouse_id:'22222222-2222-2222-2222-222222222222',
  code:'NV01',
  name:'Nhân viên 01',
  role:'barista',
  shift:'full',
  attendance_mode:'day',
  active:true
};

const supabase={
  from(name){calls.push({kind:'from',name});throw new Error('base-table select must not be used by employees parity');},
  async rpc(name,params){calls.push({kind:'rpc',name,params});return {data:[employee],error:null};}
};

const core=createFreshCoreV3({
  supabase,
  getOrgId:()=> '33333333-3333-3333-3333-333333333333',
  initialState:{orgId:'33333333-3333-3333-3333-333333333333'}
});

assert.equal(core.features.status().employees.phase,'registered');
assert.equal(calls.length,0,'employees feature must not auto-run or read cloud data');

const domain=await core.features.activate('employees',{
  gateway:core.gateway,
  events:core.events,
  v2Adapter:{getEmployees:()=>[employee]}
});
assert.equal(domain.service.autoRun,false);
assert.equal(domain.service.authoritative,false);
assert.equal(calls.length,0,'feature activation alone must not read cloud data');

const started=Date.now();
const shadow=await domain.service.evaluateDirectoryShadow({
  orgId:'33333333-3333-3333-3333-333333333333',
  warehouseId:'22222222-2222-2222-2222-222222222222'
});
const durationMs=Math.max(1,Date.now()-started);

assert.equal(shadow.parityReady,true);
assert.equal(shadow.writes,0);
assert.equal(calls.length,1,'manual parity evaluation must perform exactly one cloud read');
assert.deepEqual(calls[0],{
  kind:'rpc',
  name:'ly_list_employee_directory',
  params:{
    p_org_id:'33333333-3333-3333-3333-333333333333',
    p_warehouse_id:'22222222-2222-2222-2222-222222222222'
  }
});
assert.equal(calls.some(call=>call.kind==='from'),false,'employees parity must never select base tables directly');

const gate=evaluateEmployeesDirectoryParityGate({
  source:'device-local',
  complete:true,
  parityReady:shadow.parityReady,
  reads:1,
  writes:0,
  durationMs,
  legacyCount:shadow.parity.legacyCount,
  cloudCount:shadow.parity.cloudCount
});
assert.equal(gate.pass,true);
assert.equal(gate.activationAllowed,false);
assert.equal(gate.authoritative,false);
assert.equal(gate.autoPromotion,false);
assert.equal(gate.unlockControlledShadowReview,true);

const synthetic=evaluateEmployeesDirectoryParityGate({...gate.observation,source:'synthetic'});
assert.equal(synthetic.pass,false,'synthetic observations must receive zero credit');

core.destroy();
console.log('Fresh Core V3 employees manual runtime parity: PASS');
