import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const runtime=await fs.readFile(new URL('../ly-fresh-core-v3-runtime.js',import.meta.url),'utf8');
const router=await fs.readFile(new URL('../src-v3/app/router.js',import.meta.url),'utf8');
const security=await fs.readFile(new URL('../ly-menu-security.js',import.meta.url),'utf8');

assert.match(runtime,/let bootPromise=null/,'V3 runtime must serialize boot');
assert.match(runtime,/if\(bootPromise\)return bootPromise/,'V3 runtime must reuse an in-flight boot');
assert.match(runtime,/window\.__lyFreshCoreV3\?\.router\?\.authoritative===true/,'V3 runtime must detect an already-installed router');
assert.match(runtime,/const legacyShowTab=window\.showTab/,'V3 must capture legacy showTab once before router install');
assert.match(runtime,/window\.__lyFreshCoreV2\|\|null/,'V3 shell must boot even when V2 core is unavailable');
assert.doesNotMatch(runtime,/!window\.__lyFreshCoreV2/,'V3 shell boot must not be blocked by missing V2 core');
assert.doesNotMatch(runtime,/__lyFreshCoreV3Runtime\?\.core/,'runtime readiness must not depend on a nonexistent core property');
assert.match(router,/if\(state\.inNavigate\)/,'router must hard-stop reentrant navigation');
assert.match(router,/legacy!==navigate/,'router must never invoke itself through the legacy pointer');
assert.match(router,/if\(legacy===navigate\)legacy=null/,'router must clear a self-referential legacy pointer');
assert.match(security,/if\(window\.showTab===st\.guard\)return/,'menu security must not wrap itself repeatedly');
console.log('Fresh Core V3 recursion guard: PASS');
