import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const browserSource = await readFile(new URL('../ly-vibe-read-cache.js', import.meta.url), 'utf8');
const requests = [];
const events = {};
const window = { __lyFreshOrgId: 'a', lyFreshFetch: async () => [], addEventListener: (name, fn) => { events[name] = fn; } };
vm.runInNewContext(browserSource, {
  window, location: { hostname: 'test.tinhgon.xyz' }, Date, setTimeout,
  fetch: () => { const request = deferred(); requests.push(request); return request.promise; },
});
const respond = (index, orgId, id) => requests[index].resolve({ ok: true, json: async () => ({ orgId, tables: { ly_products: [{ id }] } }) });
const first = window.lyFreshFetch('ly_products');
const shared = window.lyFreshFetch('ly_products');
assert.equal(requests.length, 1, 'concurrent readers share a request');
events['latyen:change-signal']();
const fresh = window.lyFreshFetch('ly_products');
respond(1, 'a', 'new');
assert.equal((await fresh)[0].id, 'new');
respond(0, 'a', 'old');
assert.equal((await first)[0].id, 'new');
assert.equal((await shared)[0].id, 'new');
assert.equal(window.__lyVibeReadCache.rows('ly_products')[0].id, 'new');
window.__lyFreshOrgId = 'b';
assert.equal(window.__lyVibeReadCache.rows('ly_products').length, 0);
const other = window.lyFreshFetch('ly_products');
requests[2].resolve({ ok: false, status: 500 });
await assert.rejects(other, /snapshot-500/, 'another organization must never receive stale rows');

const serverSource = await readFile(new URL('./vibehost-snapshot-api.mjs', import.meta.url), 'utf8');
const builds = [];
const context = {
  snapshotCache: new Map(), pendingSnapshots: new Map(), Date,
  buildSnapshot: () => { const build = deferred(); builds.push(build); return build.promise; },
};
vm.createContext(context);
vm.runInContext(serverSource.slice(serverSource.indexOf('async function snapshotFor('), serverSource.indexOf('export async function handleSnapshotApi')) + serverSource.slice(serverSource.indexOf('export function invalidateSnapshot')).replace('export function', 'function'), context);
const old = context.snapshotFor('a');
const alsoOld = context.snapshotFor('a');
assert.equal(builds.length, 1);
context.invalidateSnapshot('a');
const current = context.snapshotFor('a');
builds[0].resolve({ value: 'old', expiresAt: Date.now() + 15000 });
await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
assert.equal(context.pendingSnapshots.size, 1, 'old cleanup preserves replacement request');
builds[1].resolve({ value: 'new', expiresAt: Date.now() + 15000 });
for (const result of await Promise.all([old, alsoOld, current])) assert.equal(result.value, 'new');
assert.equal(builds.length, 2);
assert.equal((await context.snapshotFor('a')).value, 'new');
context.invalidateSnapshot();
assert.equal(context.snapshotCache.size, 0);
const churn = context.snapshotFor('a');
const rejected = assert.rejects(churn, /changed repeatedly/);
for (let attempt = 0; attempt < 3; attempt += 1) {
  context.invalidateSnapshot('a');
  builds.at(-1).resolve({ value: 'invalidated', expiresAt: Date.now() + 15000 });
  await new Promise(resolve => setImmediate(resolve));
}
await rejected;
assert.equal(context.snapshotCache.size, 0, 'repeated writes never cache an invalidated response');
console.log('Snapshot concurrency: browser/server coalescing, invalidation races and organization isolation passed.');
