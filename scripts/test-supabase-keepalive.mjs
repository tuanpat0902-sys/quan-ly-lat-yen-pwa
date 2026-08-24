import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const migration=await fs.readFile(new URL('../supabase/migrations/20260824171535_add_read_only_keepalive_rpc.sql',import.meta.url),'utf8');
const workflow=await fs.readFile(new URL('../.github/workflows/supabase-keepalive.yml',import.meta.url),'utf8');
assert.match(migration,/function public\.ly_keepalive\(\)/);assert.match(migration,/stable/);assert.match(migration,/security invoker/);assert.match(migration,/revoke all .* from public/);assert.match(migration,/grant execute .* to anon, authenticated/);
assert.doesNotMatch(migration,/insert|update|delete|truncate/i,'keepalive migration must not mutate business data');
assert.match(workflow,/push:\s*\n\s*branches: \["main"\]/);assert.match(workflow,/cron: "17 3 \* \* \*"/);assert.match(workflow,/workflow_dispatch/);assert.match(workflow,/permissions:\s*\n\s*contents: read/);assert.match(workflow,/rest\/v1\/rpc\/ly_keepalive/);assert.match(workflow,/sb_publishable_/);assert.match(workflow,/grep --quiet/);
assert.doesNotMatch(workflow,/service.role|service_role|SUPABASE_SECRET/i,'workflow must never use a privileged key');
console.log('Supabase daily read-only keepalive contract: PASS');
