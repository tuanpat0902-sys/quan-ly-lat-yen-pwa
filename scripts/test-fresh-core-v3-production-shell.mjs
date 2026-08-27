import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const bootstrap=await fs.readFile(new URL('../src-v3/app/bootstrap.js',import.meta.url),'utf8');
const router=await fs.readFile(new URL('../src-v3/app/router.js',import.meta.url),'utf8');
const runtime=await fs.readFile(new URL('../ly-fresh-core-v3-runtime.js',import.meta.url),'utf8');
const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');

assert.match(bootstrap,/mode='shadow'/,'V3 bootstrap must remain safe by default');
assert.match(bootstrap,/const authoritative=mode==='v3-shell'/,'V3 shell authority must be explicit');
assert.match(router,/authoritative:true/,'V3 router must own navigation');
assert.match(router,/store\?\.patch\?\.\(\{activePanel:id\}/,'V3 store must own active panel state');
assert.match(runtime,/authoritativeScope:\['navigation','application-state'\]/,'production runtime must declare V3 authoritative scope');
assert.match(runtime,/compatibilityScope:\['business-data','legacy-renderers'\]/,'V2 must be compatibility-only for business domains during migration');
assert.match(loader,/freshCoreV3Runtime/,'module loader must own the V3 production runtime');
assert.match(loader,/await load\('freshCoreV3Runtime'\)/,'V3 runtime must be activated during core startup');
console.log('Fresh Core V3 production shell: PASS');
