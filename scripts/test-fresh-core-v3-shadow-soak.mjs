import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('ly-fresh-core-v3-shadow-soak.js','utf8');
const cost=JSON.parse(fs.readFileSync('src-v3/cost-policy.json','utf8'));
const copier=fs.readFileSync('scripts/copy-pages-runtime.mjs','utf8');

assert.equal(cost.policy,'zero-added-cost');
assert.equal(cost.paidServicesAllowed,false);
assert.equal(cost.paidInfrastructureAllowed,false);
assert.equal(cost.paidApiAllowed,false);
assert.equal(cost.newSupabaseProjectAllowed,false);
assert.equal(cost.newSupabaseBranchAllowed,false);
assert.equal(cost.shadowSoak.masterDataReadOnly,true);
assert.equal(cost.shadowSoak.maxRunsPerDevicePerDay,1);
assert.equal(cost.shadowSoak.queriesPerRun,2);
assert.equal(cost.shadowSoak.cloudWrites,0);
assert.equal(cost.shadowSoak.diagnosticsStorage,'localStorage');

assert.match(source,/MIN_INTERVAL_MS=24\*60\*60\*1000/);
assert.match(source,/state\.reads\+=2/);
assert.match(source,/state\.writes=0/);
assert.match(source,/localStorage\.setItem/);
assert.doesNotMatch(source,/\.rpc\s*\(/);
assert.doesNotMatch(source,/\.insert\s*\(/);
assert.doesNotMatch(source,/\.update\s*\(/);
assert.doesNotMatch(source,/\.upsert\s*\(/);
assert.doesNotMatch(source,/\.delete\s*\(/);
assert.doesNotMatch(source,/fetch\s*\(/);
assert.match(source,/mode:'shadow'/);
assert.match(source,/authoritative:false/);
assert.match(copier,/copyV3Runtime/);

console.log('Fresh Core V3 zero-cost production shadow soak contract: PASS');
