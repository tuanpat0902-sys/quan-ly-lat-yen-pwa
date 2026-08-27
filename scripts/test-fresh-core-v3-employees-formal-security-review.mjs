import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  EMPLOYEES_FORMAL_SECURITY_REVIEW as REVIEW,
  evaluateEmployeesFormalSecurityReview
} from '../src-v3/domains/employees/formal-security-review.js';
import {EMPLOYEES_CONTRACT} from '../src-v3/domains/employees/employees-contract.js';

const ddl=await fs.readFile(new URL('../src-v3/domains/employees/review-only-ddl.sql.txt',import.meta.url),'utf8');

assert.equal(REVIEW.status,'blocked');
assert.equal(REVIEW.currentAuthority,'legacy-local');
assert.equal(REVIEW.productionSchemaPresent,false);
assert.equal(REVIEW.migrationAllowed,false);
assert.equal(REVIEW.repositoryAllowed,false);
assert.equal(REVIEW.productionActivation,false);
assert.equal(REVIEW.cloudWrites,0);

for(const key of ['warehouseOrgIntegrity','childWarehouseIntegrity','authorizationHelper']){
  assert.equal(REVIEW.findings[key].severity,'pass');
  assert.equal(REVIEW.findings[key].pass,true);
}
assert.equal(REVIEW.findings.sensitiveProjection.severity,'review-required');
assert.equal(REVIEW.findings.sensitiveProjection.pass,false);
assert.equal(REVIEW.findings.writeSurface.pass,true);
assert.equal(REVIEW.findings.anonymousAccess.pass,true);
assert.equal(REVIEW.findings.rlsCoverage.pass,true);

const blocked=evaluateEmployeesFormalSecurityReview();
assert.equal(blocked.pass,false);
assert.equal(blocked.blockers,0);
assert.equal(blocked.unresolved,1);
assert.equal(blocked.migrationAllowed,false);
assert.equal(blocked.repositoryAllowed,false);
assert.equal(blocked.authoritative,false);
assert.equal(blocked.recommendation,'keep-legacy-local-and-resolve-sensitive-projection');

assert.match(ddl,/add constraint ly_warehouses_id_org_uniq unique \(id, org_id\)/);
assert.match(ddl,/foreign key \(warehouse_id, org_id\) references public\.ly_warehouses\(id, org_id\)/);
assert.match(ddl,/unique \(id, org_id, warehouse_id\)/);
assert.equal((ddl.match(/foreign key \(employee_id, org_id, warehouse_id\)/g)||[]).length,2);
assert.equal((ddl.match(/references public\.ly_employees\(id, org_id, warehouse_id\)/g)||[]).length,2);

assert.match(ddl,/create or replace function ly_private\.ly_is_org_admin\(p_org_id uuid\)/);
assert.match(ddl,/security definer/);
assert.match(ddl,/set search_path = ''/);
assert.match(ddl,/m\.user_id = auth\.uid\(\)/);
assert.match(ddl,/m\.org_id = p_org_id/);
assert.match(ddl,/lower\(m\.role\) = 'admin'/);
assert.match(ddl,/revoke all on function ly_private\.ly_is_org_admin\(uuid\) from public, anon, authenticated/);
assert.match(ddl,/grant execute on function ly_private\.ly_is_org_admin\(uuid\) to authenticated/);
assert.equal((ddl.match(/using \(ly_private\.ly_is_org_admin\(org_id\)\)/g)||[]).length,3);
assert.doesNotMatch(ddl,/admin@latyen\.vn/i);
assert.doesNotMatch(ddl,/ly_private\.ly_is_admin\(\)/);
assert.doesNotMatch(ddl,/ly_private\.ly_current_org\(\)/);
assert.doesNotMatch(ddl,/create\s+view/i);

assert.equal(EMPLOYEES_CONTRACT.currentAuthority,'legacy-local');
assert.equal(EMPLOYEES_CONTRACT.cloud.schemaPresent,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.writes,0);
assert.equal(EMPLOYEES_CONTRACT.nextGate,'resolve-sensitive-projection-before-migration');

console.log('Fresh Core V3-6 formal security review gate: PASS');
