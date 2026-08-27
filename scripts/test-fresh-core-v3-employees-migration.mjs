import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {EMPLOYEES_CLOUD_SCHEMA_DECISION as DECISION,evaluateEmployeesSchemaDecision} from '../src-v3/domains/employees/cloud-schema-decision.js';
import {EMPLOYEES_FORMAL_SECURITY_REVIEW as REVIEW,evaluateEmployeesFormalSecurityReview} from '../src-v3/domains/employees/formal-security-review.js';
import {EMPLOYEES_CONTRACT} from '../src-v3/domains/employees/employees-contract.js';

const review=await fs.readFile(new URL('../src-v3/domains/employees/review-only-ddl.sql.txt',import.meta.url),'utf8');
const migration=await fs.readFile(new URL('../supabase/migrations/20260827155000_fresh_core_v3_employees_schema.sql',import.meta.url),'utf8');
const executable=text=>text.replace(/--.*$/gm,'').replace(/\s+/g,' ').trim();
const sql=executable(migration);

assert.equal(executable(migration),executable(review),'generated migration must match the approved executable review DDL exactly');
assert.equal(evaluateEmployeesSchemaDecision().migrationAllowed,true);
assert.equal(evaluateEmployeesSchemaDecision().repositoryAllowed,false);
assert.equal(evaluateEmployeesFormalSecurityReview().migrationAllowed,true);
assert.equal(evaluateEmployeesFormalSecurityReview().repositoryAllowed,false);
assert.equal(DECISION.approvalScope,'migration-generation-only');
assert.equal(REVIEW.approvalScope,'migration-generation-only');
assert.equal(EMPLOYEES_CONTRACT.cloud.migrationGenerated,true);
assert.equal(EMPLOYEES_CONTRACT.cloud.migrationApplied,false);
assert.equal(EMPLOYEES_CONTRACT.currentAuthority,'legacy-local');
assert.equal(EMPLOYEES_CONTRACT.productionActivation,false);
assert.equal(EMPLOYEES_CONTRACT.dualWrite,false);

for(const table of ['ly_employees','ly_employee_attendance','ly_employee_payroll']){
  assert.match(sql,new RegExp(`create table public\\.${table} \\(`));
  assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security;`));
  assert.match(sql,new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated;`));
  assert.doesNotMatch(sql,new RegExp(`grant select on table public\\.${table}`));
}
assert.match(sql,/add constraint ly_warehouses_id_org_uniq unique \(id, org_id\)/);
assert.match(sql,/foreign key \(warehouse_id, org_id\) references public\.ly_warehouses\(id, org_id\)/);
assert.equal((sql.match(/foreign key \(employee_id, org_id, warehouse_id\)/g)||[]).length,2);

assert.match(sql,/create or replace function ly_private\.ly_is_org_admin\(p_org_id uuid\)/);
assert.match(sql,/revoke all on function ly_private\.ly_is_org_admin\(uuid\) from public, anon, authenticated/);
assert.doesNotMatch(sql,/grant execute on function ly_private\.ly_is_org_admin/);
assert.doesNotMatch(sql,/admin@latyen\.vn/i);

assert.match(sql,/create or replace function public\.ly_list_employee_directory\(/);
assert.match(sql,/grant execute on function public\.ly_list_employee_directory\(uuid, uuid\) to authenticated/);
const projection=sql.match(/create or replace function public\.ly_list_employee_directory[\s\S]*?\$function\$;/)?.[0]||'';
for(const field of DECISION.sensitiveDataPolicy.defaultListProjection){
  assert.match(projection,new RegExp(`\\b${field}\\b`));
}
for(const forbidden of ['phone','address','emergency_contact','bank_account','id_number','base_salary','hourly_rate','standard_days','note','legacy_id','allowance','bonus','deduction','daily_bonus','daily_penalty']){
  assert.doesNotMatch(projection,new RegExp(`\\b${forbidden}\\b`),`migration safe projection must exclude ${forbidden}`);
}
assert.doesNotMatch(projection,/ly_employee_attendance|ly_employee_payroll/);

assert.doesNotMatch(sql,/\binsert\s+into\b/i);
assert.doesNotMatch(sql,/\bupdate\s+public\./i);
assert.doesNotMatch(sql,/\bdelete\s+from\b/i);
assert.doesNotMatch(sql,/\btruncate\b/i);
assert.doesNotMatch(sql,/\bcopy\s+public\./i);
assert.doesNotMatch(sql,/for\s+(insert|update|delete|all)\b/i);
assert.equal((sql.match(/for select\s+to authenticated/g)||[]).length,0);

console.log('Fresh Core V3-6 generated schema-only migration guard: PASS');
