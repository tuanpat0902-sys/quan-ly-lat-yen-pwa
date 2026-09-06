import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [client,api,mirror,server,start,loader]=await Promise.all([
  fs.readFile(new URL('../ly-vibe-read-cache.js',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-snapshot-api.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-supabase-mirror.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-static-server.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-start.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8'),
]);
assert.match(api,/\/auth\/v1\/user/,'snapshot API must verify the active Supabase user');
assert.match(api,/ly_org_members/,'snapshot API must enforce organization membership');
assert.match(api,/gzipAsync/,'snapshot payload must be compressed');
assert.doesNotMatch(client,/SECRET_KEY|service_role/,'browser bundle must not contain privileged keys');
assert.match(client,/latyen:change-signal/,'fresh changes must bypass a potentially stale mirror');
assert.match(client,/return original\(table,orderColumn,ascending\)/,'Supabase fallback must remain available');
assert.match(mirror,/hour >= 6/,'mirror must pause recurring work from midnight to 06:00');
assert.match(mirror,/updated_at.*created_at/,'mirror must prefer incremental timestamp reads');
assert.match(server,/handleSnapshotApi/,'same-origin server must expose the authenticated snapshot API');
assert.match(start,/startSupabaseMirror/,'production startup must enable the mirror worker');
assert.match(loader,/await load\('vibeReadCache'\)/,'read cache must load before hydration');
assert.match(loader,/ly-vibe-read-cache\.js\?v=20260906\.1/,'loader must request the versioned cache bridge');
console.log('Vibe authenticated read-cache contract: PASS');
