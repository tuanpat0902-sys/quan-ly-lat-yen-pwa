import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const runner=await fs.readFile(new URL('../ly-fresh-core-v3-employees-parity-runner.js',import.meta.url),'utf8');
const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');
const appVersion=await fs.readFile(new URL('../ly-app-version.js',import.meta.url),'utf8');
const sw=await fs.readFile(new URL('../sw.js',import.meta.url),'utf8');

assert.match(runner,/const VERSION='2026\.08\.28\.2'/);
assert.match(runner,/lat_yen_v3_employees_directory_parity_v2/,'runner must ignore the invalidated v1 empty-parity evidence');
assert.match(runner,/window\.loadEmployees\?\.\(\)/,'runner must source legacy rows from the actual device runtime');
assert.match(runner,/window\.warehouse\?\.\(\)\?\.id/,'runner must bind evidence to the active device warehouse');
assert.match(runner,/createEmployeesDirectorySource/,'runner must use the data-layer RPC adapter');
assert.match(runner,/runEmployeesManualDeviceParity/,'runner must use the guarded pure parity runner');
assert.match(runner,/addEventListener\('click'/,'cloud parity must require an explicit user click');
assert.match(runner,/const settings=document\.getElementById\('settings'\)/,'runner card must be owned by Settings, not by a re-rendered V3-2 child card');
assert.match(runner,/box\.className='card ly-v3-card'/,'runner must render as a standalone Settings card');
assert.match(runner,/anchor\.insertAdjacentElement\('afterend',box\)/,'runner should sit next to the V3 status card when available');
assert.doesNotMatch(runner,/host\.appendChild\(box\)/,'runner must not be nested inside the V3-2 status card');
assert.match(runner,/0\/0 không có dữ liệu nhân viên để xác minh/,'empty parity must be visibly locked rather than shown as PASS');
assert.match(runner,/0\/0 không được tính là parity evidence/,'UI note must disclose that empty parity has zero migration credit');
assert.doesNotMatch(runner,/\.rpc\s*\(/,'browser runner must not call Supabase transport directly');
assert.doesNotMatch(runner,/\.from\s*\(/,'browser runner must not query employee base tables');
assert.doesNotMatch(runner,/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/,'browser runner must not create a write path');
assert.doesNotMatch(runner,/setInterval\s*\(|requestIdleCallback\s*\(/,'runner must not schedule automatic parity');
assert.match(runner,/cloudReadsPerRun:1,cloudWritesPerRun:0/);
assert.match(runner,/emptyDatasetCredit:0/);
assert.match(runner,/authoritative:false,activationAllowed:false,autoPromotion:false/);

assert.match(loader,/freshCoreV3EmployeesParityRunner:\{src:'\.\/ly-fresh-core-v3-employees-parity-runner\.js\?v=20260828\.1'/);
assert.match(loader,/if\(panel==='settings'\)[\s\S]*await load\('freshCoreV3EmployeesParityRunner'\)/,'Settings preparation remains an idempotent fallback loader');
assert.doesNotMatch(loader,/loadBackground=.*freshCoreV3EmployeesParityRunner/,'runner must not be loaded by idle/background scheduling');

assert.match(appVersion,/REVISION='fresh-core-v3-shell-authoritative-v18'/,'app boot revision must advance with the current release');
assert.match(appVersion,/function ensureEmployeesParityRunner\(\)/,'app boot must expose a deterministic runner bootstrap');
assert.match(appVersion,/ly-fresh-core-v3-employees-parity-runner\.js\?v=20260828\.3/,'app boot must use a cache-busted runner URL');
assert.match(appVersion,/function boot\(\)\{ensureUILayers\(\);mount\(\);ensureEmployeesParityRunner\(\);/,'runner module must be requested after presentation layers mount during normal app boot');
assert.doesNotMatch(appVersion,/\.run\?\.\(|\.run\(/,'boot loader must never execute parity automatically');
assert.doesNotMatch(appVersion,/\.rpc\s*\(|\.from\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/,'boot loader must not create any cloud data path');

assert.match(sw,/lat-yen-fresh-core-v3-authoritative-240/,'current service worker release must continue invalidating cached false-positive parity runner bytes');
assert.match(sw,/cacheFirstStatic\(request\)[\s\S]*fetch\(request,\{cache:'reload'\}\)/,'new static assets must bypass stale Safari HTTP cache before entering the release cache');

console.log('Fresh Core V3 employees device runner UI guard: PASS');
