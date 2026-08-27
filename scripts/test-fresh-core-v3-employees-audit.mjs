import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {EMPLOYEES_CONTRACT,EMPLOYEES_MIGRATION_GUARD} from '../src-v3/domains/employees/employees-contract.js';

const baseline=JSON.parse(await fs.readFile(new URL('../src-v3/domains/employees/production-baseline.json',import.meta.url),'utf8'));
const ui=await fs.readFile(new URL('../ly-employees.js',import.meta.url),'utf8');
const extraction=await fs.readFile(new URL('./extract-employees.mjs',import.meta.url),'utf8');

assert.equal(EMPLOYEES_CONTRACT.domain,'employees');
assert.equal(EMPLOYEES_CONTRACT.wave,'V3-6');
assert.deepEqual(EMPLOYEES_CONTRACT.dependsOn,['V3-0']);
assert.equal(EMPLOYEES_CONTRACT.currentAuthority,'legacy-local');
assert.equal(EMPLOYEES_CONTRACT.v3Authoritative,false);
assert.equal(EMPLOYEES_CONTRACT.productionActivation,false);
assert.equal(EMPLOYEES_CONTRACT.autoPromotion,false);
assert.equal(EMPLOYEES_CONTRACT.dualWrite,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.schemaPresent,false);
assert.deepEqual(EMPLOYEES_CONTRACT.cloud.tables,[]);
assert.equal(EMPLOYEES_CONTRACT.cloud.reads,0);
assert.equal(EMPLOYEES_CONTRACT.cloud.writes,0);
assert.equal(EMPLOYEES_MIGRATION_GUARD.allowInferredTableNames,false);
assert.equal(EMPLOYEES_MIGRATION_GUARD.allowSyntheticCloudSource,false);
assert.equal(EMPLOYEES_MIGRATION_GUARD.requireCloudSchemaDecision,true);
assert.equal(EMPLOYEES_MIGRATION_GUARD.requireSensitiveDataReview,true);

assert.equal(baseline.currentAuthority,'legacy-local');
assert.equal(baseline.cloudSchema.schemaPresent,false);
assert.deepEqual(baseline.cloudSchema.employeeNamedTables,[]);
assert.equal(baseline.constraints.noSupabaseMigration,true);
assert.equal(baseline.constraints.noInferredCloudTable,true);

for(const token of ['loadEmployees()','renderEmployeeAttendance()','renderEmployeeSalaryReport()']){
  assert.match(ui,new RegExp(token.replace(/[()]/g,'\\$&')));
}
for(const field of ['e.code','e.name','e.role','e.phone','e.hire_date','e.shift','e.base_salary','e.bank_account']){
  assert.ok(ui.includes(field),`employee UI evidence missing ${field}`);
}
assert.match(extraction,/Employee data, attendance, payroll calculations and persistence remain in Legacy core\./);
assert.match(extraction,/function loadEmployees\(/);

console.log('Fresh Core V3-6 employees source-of-truth audit: PASS');
