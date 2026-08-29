import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');

assert.match(loader,/function legacyShellReady\(\)/,'module loader must detect the legacy navigation shell');
assert.match(loader,/async function waitForLegacyShell\(/,'module loader must wait for shell readiness without a recurring interval');
assert.match(loader,/await waitForLegacyShell\(\);[\s\S]*await Promise\.all\(\[load\('hydration'\)/,'legacy-dependent modules must wait for showTab/renderPanel/navInit, then load independent layers in parallel');
assert.doesNotMatch(loader,/setInterval\s*\(/,'module-loader startup readiness must not add polling intervals');
assert.match(loader,/legacyShellReady\(\).*showTab.*renderPanel.*navInit/s,'shell readiness must include navigation and renderer ownership');
console.log('Legacy shell startup ordering: PASS');
