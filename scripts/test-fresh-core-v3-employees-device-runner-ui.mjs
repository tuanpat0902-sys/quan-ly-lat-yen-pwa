import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const runner=await fs.readFile(new URL('../ly-fresh-core-v3-employees-parity-runner.js',import.meta.url),'utf8');
const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');

assert.match(runner,/const VERSION='2026\.08\.28\.1'/);
assert.match(runner,/window\.loadEmployees\?\.\(\)/,'runner must source legacy rows from the actual device runtime');
assert.match(runner,/window\.warehouse\?\.\(\)\?\.id/,'runner must bind evidence to the active device warehouse');
assert.match(runner,/createEmployeesDirectorySource/,'runner must use the data-layer RPC adapter');
assert.match(runner,/runEmployeesManualDeviceParity/,'runner must use the guarded pure parity runner');
assert.match(runner,/addEventListener\('click'/,'cloud parity must require an explicit user click');
assert.doesNotMatch(runner,/\.rpc\s*\(/,'browser runner must not call Supabase transport directly');
assert.doesNotMatch(runner,/\.from\s*\(/,'browser runner must not query employee base tables');
assert.doesNotMatch(runner,/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/,'browser runner must not create a write path');
assert.doesNotMatch(runner,/setInterval\s*\(|requestIdleCallback\s*\(/,'runner must not schedule automatic parity');
assert.match(runner,/cloudReadsPerRun:1,cloudWritesPerRun:0/);
assert.match(runner,/authoritative:false,activationAllowed:false,autoPromotion:false/);

assert.match(loader,/freshCoreV3EmployeesParityRunner:\{src:'\.\/ly-fresh-core-v3-employees-parity-runner\.js\?v=20260828\.1'/);
assert.match(loader,/if\(panel==='settings'\)[\s\S]*await load\('freshCoreV3EmployeesParityRunner'\)/,'runner must be loaded only through explicit Settings preparation');
assert.doesNotMatch(loader,/loadBackground=.*freshCoreV3EmployeesParityRunner/,'runner must not be background-loaded');

console.log('Fresh Core V3 employees device runner UI guard: PASS');
