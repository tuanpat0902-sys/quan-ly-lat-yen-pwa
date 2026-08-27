import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  EMPLOYEES_FORMAL_SECURITY_REVIEW as REVIEW,
  evaluateEmployeesFormalSecurityReview
} from '../src-v3/domains/employees/formal-security-review.js';
import {EMPLOYEES_CONTRACT} from '../src-v3/domains/employees/employees-contract.js';

const ddl=await fs.readFile(new URL('../src-v3/domains/employees/review-only-ddl.sql.txt',import.meta.url),'utf8');

assert.equal(REVIEW.status,'approved');
assert.equal(REVIEW.approvalScope,'migration-generation-only');
assert.equal(REVIEW.currentAuthority,'legacy-local');
assert.equal(REVIEW.productionSchemaPresent,false);
assert.equal(REVIEW.migrationAllowed,true);
assert.equal(REVIEW.repositoryAllowed,false);
assert.equal(REVIEW.productionActivation,false);
assert.equal(REVIEW.cloudWrites,0);
for(const key of ['warehouseOrgIntegrity','childWarehouseIntegrity','authorizationHelper','sensitiveProjection','writeSurface','anonymousAccess','rlsCoverage']){
  assert.equal(REVIEW.findings[key].severity,'pass');
  assert.equal(REVIEW.findings[key].pass,true);
}
const approved=evaluateEmployeesFormalSecurityReview();
assert.equal(approved.pass,true);
assert.equal(approved.technicalReviewComplete,true);
assert.equal(approved.blockers,0);
assert.equal(approved.unresolved,0);
assert.equal(approved.migrationAllowed,true);
assert.equal(approved.repositoryAllowed,false);
assert.equal(approved.authoritative,false);
assert.equal(approved.recommendation,'eligible-for-schema-only-migration-generation');

assert.match(ddl,/add constraint ly_warehouses_id_org_uniq unique \(id, org_id\)/);
assert.equal((ddl.match(/foreign key \(employee_id, org_id, warehouse_id\)/g)||[]).length,2);
assert.match(ddl,/create or replace function ly_private\.ly_is_org_admin\(p_org_id uuid\)/);
assert.match(ddl,/revoke all on function ly_private\.ly_is_org_admin\(uuid\) from public, anon, authenticated/);
assert.doesNotMatch(ddl,/grant execute on function ly_private\.ly_is_org_admin/);
assert.doesNotMatch(ddl,/admin@latyen\.vn/i);
assert.match(ddl,/create or replace function public\.ly_list_employee_directory\(/);
assert.equal((ddl.match(/grant select on table public\.ly_employee/g)||[]).length,0);
assert.equal((ddl.match(/for select\s+to authenticated/g)||[]).length,0);
assert.match(ddl,/grant execute on function public\.ly_list_employee_directory\(uuid, uuid\) to authenticated/);
assert.doesNotMatch(ddl,/create\s+view/i);

assert.equal(EMPLOYEES_CONTRACT.status,'migration-generation-approved');
assert.equal(EMPLOYEES_CONTRACT.currentAuthority,'legacy-local');
assert.equal(EMPLOYEES_CONTRACT.cloud.schemaPresent,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.migrationGenerated,true);
assert.equal(EMPLOYEES_CONTRACT.cloud.migrationApplied,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.safeProjection,'public.ly_list_employee_directory(uuid,uuid)');
assert.equal(EMPLOYEES_CONTRACT.cloud.writes,0);
assert.equal(EMPLOYEES_CONTRACT.nextGate,'review-schema-only-migration-before-production-apply');
console.log('Fresh Core V3-6 formal security review gate: PASS');
