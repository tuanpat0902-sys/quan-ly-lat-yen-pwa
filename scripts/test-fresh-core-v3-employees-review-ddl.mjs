import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {EMPLOYEES_CONTRACT,EMPLOYEES_MIGRATION_GUARD} from '../src-v3/domains/employees/employees-contract.js';
import {EMPLOYEES_CLOUD_SCHEMA_DECISION as DECISION} from '../src-v3/domains/employees/cloud-schema-decision.js';

const ddl=await fs.readFile(new URL('../src-v3/domains/employees/review-only-ddl.sql.txt',import.meta.url),'utf8');
assert.match(ddl,/DO NOT APPLY TO PRODUCTION/);
for(const table of ['ly_employees','ly_employee_attendance','ly_employee_payroll']){
  assert.match(ddl,new RegExp(`alter table public\\.${table} enable row level security;`));
  assert.match(ddl,new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated;`));
  assert.doesNotMatch(ddl,new RegExp(`grant select on table public\\.${table}`));
}
assert.equal((ddl.match(/for select\s+to authenticated/g)||[]).length,0);
assert.doesNotMatch(ddl,/grant\s+(insert|update|delete|all)\b/i);
assert.doesNotMatch(ddl,/for\s+(insert|update|delete|all)\b/i);
assert.doesNotMatch(ddl,/create\s+view/i);

assert.match(ddl,/create or replace function ly_private\.ly_is_org_admin\(p_org_id uuid\)/);
assert.match(ddl,/m\.user_id = auth\.uid\(\)/);
assert.match(ddl,/m\.org_id = p_org_id/);
assert.match(ddl,/lower\(m\.role\) = 'admin'/);
assert.doesNotMatch(ddl,/admin@latyen\.vn/i);

assert.match(ddl,/create or replace function public\.ly_list_employee_directory\(/);
assert.match(ddl,/p_org_id uuid,\s+p_warehouse_id uuid/);
assert.match(ddl,/returns table \(\s+id uuid,\s+warehouse_id uuid,\s+code text,\s+name text,\s+role text,\s+shift text,\s+attendance_mode text,\s+active boolean\s+\)/);
assert.match(ddl,/where ly_private\.ly_is_org_admin\(p_org_id\)/);
assert.match(ddl,/e\.org_id = p_org_id/);
assert.match(ddl,/e\.warehouse_id = p_warehouse_id/);
assert.match(ddl,/revoke all on function public\.ly_list_employee_directory\(uuid, uuid\) from public, anon, authenticated/);
assert.match(ddl,/grant execute on function public\.ly_list_employee_directory\(uuid, uuid\) to authenticated/);

const projection=ddl.match(/create or replace function public\.ly_list_employee_directory[\s\S]*?\$function\$;/)?.[0]||'';
for(const field of DECISION.sensitiveDataPolicy.defaultListProjection){
  assert.match(projection,new RegExp(`\\b${field}\\b`));
}
for(const forbidden of ['phone','address','emergency_contact','bank_account','id_number','base_salary','hourly_rate','standard_days','note','legacy_id','allowance','bonus','deduction','daily_bonus','daily_penalty']){
  assert.doesNotMatch(projection,new RegExp(`\\b${forbidden}\\b`),`safe projection must exclude ${forbidden}`);
}
assert.doesNotMatch(projection,/ly_employee_attendance|ly_employee_payroll/);
assert.equal((ddl.match(/security definer/g)||[]).length,2);
assert.equal((ddl.match(/set search_path = ''/g)||[]).length,2);

assert.equal(DECISION.status,'proposed-not-approved');
assert.equal(DECISION.migrationAllowed,false);
assert.equal(DECISION.repositoryAllowed,false);
assert.equal(EMPLOYEES_CONTRACT.currentAuthority,'legacy-local');
assert.equal(EMPLOYEES_CONTRACT.cloud.schemaPresent,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.directBaseTableSelect,false);
assert.equal(EMPLOYEES_CONTRACT.cloud.safeProjection,'public.ly_list_employee_directory(uuid,uuid)');
assert.equal(EMPLOYEES_CONTRACT.cloud.writes,0);
assert.equal(EMPLOYEES_MIGRATION_GUARD.requireDbEnforcedSafeProjection,true);
console.log('Fresh Core V3-6 review-only DDL/RLS security guard: PASS');
