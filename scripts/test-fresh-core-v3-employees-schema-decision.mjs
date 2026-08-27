import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  EMPLOYEES_CLOUD_SCHEMA_DECISION as DECISION,
  evaluateEmployeesSchemaDecision
} from '../src-v3/domains/employees/cloud-schema-decision.js';
import {EMPLOYEES_CONTRACT,EMPLOYEES_MIGRATION_GUARD} from '../src-v3/domains/employees/employees-contract.js';

const simulation=await fs.readFile(new URL('../ly-simulation-personnel.js',import.meta.url),'utf8');

assert.equal(DECISION.status,'proposed-not-approved');
assert.equal(DECISION.currentAuthority,'legacy-local');
assert.equal(DECISION.approvalRequired,true);
assert.equal(DECISION.migrationAllowed,false);
assert.equal(DECISION.repositoryAllowed,false);
assert.equal(DECISION.productionActivation,false);
assert.equal(DECISION.dualWrite,false);
assert.equal(DECISION.cloudWrites,0);
assert.deepEqual(DECISION.tenancy.requiredColumns,['org_id','warehouse_id']);

assert.equal(DECISION.sourceEvidence.legacyEmployeeIdType,'opaque-text-not-guaranteed-uuid');
assert.equal(DECISION.identity.cloudPrimaryKey,'uuid-generated-in-cloud');
assert.equal(DECISION.identity.legacyMigrationKey,'legacy_id-text');
assert.equal(DECISION.identity.preserveLegacyId,true);
assert.match(DECISION.identity.childImportMapping,/legacy_id/);

assert.equal(DECISION.candidates.employees.candidateName,'ly_employees');
assert.equal(DECISION.candidates.attendance.candidateName,'ly_employee_attendance');
assert.equal(DECISION.candidates.payroll.candidateName,'ly_employee_payroll');
for(const table of Object.values(DECISION.candidates))assert.equal(table.approved,false);
assert.equal(DECISION.candidates.employees.columns.id,'uuid not null');
assert.equal(DECISION.candidates.employees.columns.legacy_id,'text not null');
assert.equal(DECISION.candidates.attendance.columns.employee_id,'uuid not null');
assert.equal(DECISION.candidates.payroll.columns.employee_id,'uuid not null');
assert.deepEqual(DECISION.candidates.employees.uniqueKeys[0],['org_id','warehouse_id','legacy_id']);

for(const field of ['bank_account','id_number'])assert.ok(DECISION.sensitiveDataPolicy.restrictedFields.includes(field));
for(const field of ['base_salary','hourly_rate'])assert.ok(DECISION.sensitiveDataPolicy.confidentialFields.includes(field));
for(const forbidden of ['bank_account','id_number','phone','base_salary','hourly_rate']){
  assert.ok(!DECISION.sensitiveDataPolicy.defaultListProjection.includes(forbidden),`default projection must exclude ${forbidden}`);
}
assert.ok(DECISION.sensitiveDataPolicy.requirements.includes('row-level-security-required-before-any-production-read'));
assert.ok(DECISION.sensitiveDataPolicy.requirements.includes('no-anonymous-access'));

const blocked=evaluateEmployeesSchemaDecision();
assert.equal(blocked.approved,false);
assert.equal(blocked.identityReady,true);
assert.equal(blocked.migrationAllowed,false);
assert.equal(blocked.repositoryAllowed,false);
assert.equal(blocked.authoritative,false);
assert.equal(blocked.recommendation,'keep-legacy-local-and-block-cloud-repository');

const approvedCandidate={
  ...DECISION,
  status:'approved',
  migrationAllowed:true,
  repositoryAllowed:true,
  candidates:Object.fromEntries(Object.entries(DECISION.candidates).map(([key,value])=>[key,{...value,approved:true}]))
};
const eligible=evaluateEmployeesSchemaDecision(approvedCandidate);
assert.equal(eligible.approved,true);
assert.equal(eligible.identityReady,true);
assert.equal(eligible.migrationAllowed,true);
assert.equal(eligible.repositoryAllowed,true);
assert.equal(eligible.authoritative,false,'schema approval must never make V3 authoritative');

const invalidIdentity=evaluateEmployeesSchemaDecision({...approvedCandidate,identity:{...DECISION.identity,preserveLegacyId:false}});
assert.equal(invalidIdentity.approved,false,'approval must fail if the legacy identity mapping is removed');
assert.equal(invalidIdentity.migrationAllowed,false);

assert.equal(EMPLOYEES_CONTRACT.currentAuthority,'legacy-local');
assert.equal(EMPLOYEES_CONTRACT.cloud.schemaPresent,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.reads,0);
assert.equal(EMPLOYEES_CONTRACT.cloud.writes,0);
assert.equal(EMPLOYEES_MIGRATION_GUARD.requireCloudSchemaDecision,true);
assert.equal(EMPLOYEES_MIGRATION_GUARD.requireSensitiveDataReview,true);

for(const key of ['lat_yen_employees_v1','lat_yen_employee_attendance_v1','lat_yen_employee_payroll_v1']){
  assert.ok(simulation.includes(key),`legacy evidence missing ${key}`);
}
for(const shape of ['sim-emp-20260824-001','warehouse_id:wid','attendance_mode','base_salary','hourly_rate','standard_days','bank_account','id_number','time_slots','overtime_slots','daily_bonus','daily_penalty','allowance','bonus','deduction']){
  assert.ok(simulation.includes(shape),`legacy field evidence missing ${shape}`);
}

console.log('Fresh Core V3-6 employee cloud schema decision guard: PASS');
