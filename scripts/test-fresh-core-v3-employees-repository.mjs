import assert from 'node:assert/strict';
import {createEmployeesRepository,EMPLOYEES_DIRECTORY_FIELDS} from '../src-v3/domains/employees/employees-repository.js';
import {createEmployeesService} from '../src-v3/domains/employees/employees-service.js';
import {compareEmployeeDirectory} from '../src-v3/domains/employees/parity.js';
import {EMPLOYEES_CONTRACT} from '../src-v3/domains/employees/employees-contract.js';

const calls=[];
const gateway={rpc:async(name,params)=>{calls.push({name,params});return [{id:'cloud-1',warehouse_id:'w1',code:'E01',name:'An',role:'staff',shift:'day',attendance_mode:'day',active:true,phone:'must-not-leak'}];}};
const repository=createEmployeesRepository({gateway});
const rows=await repository.listDirectory({orgId:'o1',warehouseId:'w1'});
assert.deepEqual(calls,[{name:'ly_list_employee_directory',params:{p_org_id:'o1',p_warehouse_id:'w1'}}]);
assert.deepEqual(Object.keys(rows[0]),EMPLOYEES_DIRECTORY_FIELDS);
assert.equal(rows[0].phone,undefined);
assert.throws(()=>repository.insertEmployee({}),/read-only/);
assert.throws(()=>repository.saveAttendance({}),/read-only/);
assert.throws(()=>repository.savePayroll({}),/read-only/);
assert.rejects(()=>repository.listDirectory({orgId:'',warehouseId:'w1'}),/orgId is required/);

const legacy=[{id:'legacy-1',warehouse_id:'w1',code:'E01',name:'An',role:'staff',shift:'day',attendance_mode:'day',active:true,phone:'secret'}];
const parity=compareEmployeeDirectory(legacy,rows,{warehouseId:'w1'});
assert.equal(parity.equal,true);
assert.equal(parity.legacyCount,1);
assert.equal(parity.cloudCount,1);
assert.ok(!parity.comparableFields.includes('id'));
assert.ok(!parity.comparableFields.includes('phone'));

const events=[];
const service=createEmployeesService({repository,events:{emit:(name,payload)=>events.push({name,payload})}});
const snapshot=await service.evaluateDirectoryShadow({orgId:'o1',warehouseId:'w1',v2Employees:legacy});
assert.equal(snapshot.parityReady,true);
assert.equal(snapshot.authoritative,false);
assert.equal(snapshot.mode,'manual-read-only-shadow');
assert.equal(snapshot.writes,0);
assert.equal(events[0].name,'employees:shadow-evaluated');
assert.equal(service.autoRun,false);
assert.throws(()=>service.saveEmployee({}),/read-only/);

assert.equal(EMPLOYEES_CONTRACT.currentAuthority,'legacy-local');
assert.equal(EMPLOYEES_CONTRACT.productionActivation,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.repositoryImplemented,true);
assert.equal(EMPLOYEES_CONTRACT.cloud.repositoryRuntimeActivated,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.autoShadow,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.reads,0);
assert.equal(EMPLOYEES_CONTRACT.cloud.writes,0);
assert.equal(EMPLOYEES_CONTRACT.nextGate,'obtain-device-v2-v3-directory-parity-before-shadow-activation');
console.log('Fresh Core V3-6 read-only repository guard: PASS');
