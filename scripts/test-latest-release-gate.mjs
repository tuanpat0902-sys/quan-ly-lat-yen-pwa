import fs from 'node:fs';
import assert from 'node:assert/strict';

const sw=fs.readFileSync('sw.js','utf8');
const prep=fs.readFileSync('scripts/prepare-pages-artifact.mjs','utf8');

assert.match(sw,/ignoreSearch:false/,'static cache must honor version query strings');
assert.match(sw,/runtime-version\.json/,'service worker must special-case runtime-version.json');
assert.match(sw,/clients\.matchAll\(\{type:'window',includeUncontrolled:true\}\)/,'service worker must enumerate open clients after release activation');
assert.match(sw,/client\.navigate\(/,'service worker must force open clients onto the activated release');
assert.match(prep,/lyReleaseGate/,'Pages artifact must inject an early release gate');
assert.match(prep,/controllerchange/,'release gate must reload after service-worker controller changes');
assert.match(prep,/EXPECTED_VERSION/,'release gate must know the expected release version');
assert.match(prep,/caches\.keys/,'release gate must be able to clear stale runtime caches');
console.log('Latest-release browser gate: PASS');
