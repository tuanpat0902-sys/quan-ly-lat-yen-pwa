import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const router=await fs.readFile(new URL('../src-v3/app/router.js',import.meta.url),'utf8');
const runtime=await fs.readFile(new URL('../ly-fresh-core-v3-runtime.js',import.meta.url),'utf8');
const security=await fs.readFile(new URL('../ly-menu-security.js',import.meta.url),'utf8');
const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');

assert.match(router,/legacy\.call\(window,id,btn\)/,'V3 router must preserve legacy activePanelId through the captured legacy showTab');
assert.match(router,/reconcile\(id,btn\)/,'V3 router must reconcile nav and panel state');
assert.match(router,/windowObject\.showTab=navigate/,'V3 router must own showTab');
assert.match(runtime,/mode:'v3-shell'/,'production V3 runtime must request authoritative shell mode');
assert.doesNotMatch(security,/document\.addEventListener\('click'.*stopImmediatePropagation/s,'menu security must not install a competing global nav click interceptor');
assert.match(loader,/await load\('freshCoreV3Runtime'\);[\s\S]*await load\('menuSecurity'\)/,'V3 runtime must load before menu security');
assert.doesNotMatch(loader,/finalOwnership/,'V2 final ownership must be absent from V3 production startup');
assert.doesNotMatch(loader,/await load\('navigationOwner'\)/,'legacy navigation owner must not participate in production startup');
console.log('Fresh Core V3 single-owner navigation invariant: PASS');
