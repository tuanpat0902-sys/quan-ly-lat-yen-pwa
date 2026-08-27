import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {EMPLOYEES_CONTRACT,EMPLOYEES_MIGRATION_GUARD} from '../src-v3/domains/employees/employees-contract.js';
import {EMPLOYEES_CLOUD_SCHEMA_DECISION as DECISION} from '../src-v3/domains/employees/cloud-schema-decision.js';

const ddl=await fs.readFile(new URL('../src-v3/domains/employees/review-only-ddl.sql.txt',import.meta.url),'utf8');

assert.match(ddl,/DO NOT APPLY TO PRODUCTION/);
assert.match(ddl,/intentionally outside supabase\/migrations/);
for(const table of ['ly_employees','ly_employee_attendance','ly_employee_payroll']){
  assert.match(ddl,new RegExp(`create table public\\.${table} \\(`));
  assert.match(ddl,new RegExp(`alter table public\\.${table} enable row level security;`));
  assert.match(ddl,new RegExp(`revoke all on table public\\.${table} from anon, authenticated;`));
  assert.match(ddl,new RegExp(`grant select on table public\\.${table} to authenticated;`));
}
assert.equal((ddl.match(/for select\s+to authenticated/g)||[]).length,3);
assert.equal((ddl.match(/ly_private\.ly_is_admin\(\) and org_id = ly_private\.ly_current_org\(\)/g)||[]).length,3);
assert.doesNotMatch(ddl,/grant\s+(insert|update|delete|all)\b/i);
assert.doesNotMatch(ddl,/for\s+(insert|update|delete|all)\b/i);
assert.doesNotMatch(ddl,/security\s+definer/i);
assert.doesNotMatch(ddl,/create\s+(or\s+replace\s+)?function/i);
assert.doesNotMatch(ddl,/create\s+view/i);
assert.doesNotMatch(ddl,/insert\s+into\s+public\.ly_employee/i);
assert.doesNotMatch(ddl,/update\s+public\.ly_employee/i);
assert.doesNotMatch(ddl,/delete\s+from\s+public\.ly_employee/i);

assert.match(ddl,/legacy_id text not null/);
assert.match(ddl,/unique \(org_id, warehouse_id, legacy_id\)/);
assert.match(ddl,/foreign key \(employee_id, org_id\) references public\.ly_employees\(id, org_id\)/);
assert.equal(DECISION.status,'proposed-not-approved');
assert.equal(DECISION.migrationAllowed,false);
assert.equal(DECISION.repositoryAllowed,false);
assert.equal(EMPLOYEES_CONTRACT.currentAuthority,'legacy-local');
assert.equal(EMPLOYEES_CONTRACT.cloud.schemaPresent,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.writes,0);
assert.equal(EMPLOYEES_MIGRATION_GUARD.requireSensitiveDataReview,true);

console.log('Fresh Core V3-6 review-only DDL/RLS security guard: PASS');
