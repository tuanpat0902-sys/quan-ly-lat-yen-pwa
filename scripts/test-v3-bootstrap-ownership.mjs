import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const independent=await fs.readFile(new URL('../ly-independent-bootstrap.js',import.meta.url),'utf8');
const rescue=await fs.readFile(new URL('../ly-ui-bootstrap-rescue.js',import.meta.url),'utf8');
const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');
const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');

assert.match(independent,/Fresh Core V3/,'bootstrap diagnostic must identify V3');
assert.match(independent,/routerAuthoritative/,'bootstrap readiness must use V3 router authority');
assert.doesNotMatch(independent,/__lyFreshCoreV2FinalOwnership/,'bootstrap must not wait for V2 final ownership');
assert.doesNotMatch(independent,/fresh-core-v2-authoritative/,'bootstrap must not subscribe to V2 authority events');
assert.match(rescue,/__lyFreshCoreV3\?\.router/,'UI rescue must prefer V3 router');
assert.doesNotMatch(rescue,/fresh-core-v2-authoritative/,'UI rescue must not depend on V2 authority');
assert.doesNotMatch(loader,/finalOwnership/,'V2 final ownership must not be wired by the V3 production loader');
assert.doesNotMatch(html,/ly-fresh-core-v2-final-ownership\.js/,'V2 final ownership must not be statically executed by production HTML');
console.log('Fresh Core V3 bootstrap ownership: PASS');
