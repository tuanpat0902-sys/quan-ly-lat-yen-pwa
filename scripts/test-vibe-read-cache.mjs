import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [client,api,mirror,ipos,bootstrap,auth,server,start,loader]=await Promise.all([
  fs.readFile(new URL('../ly-vibe-read-cache.js',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-snapshot-api.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-supabase-mirror.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-ipos-worker.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-ipos-bootstrap.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-auth-api.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-static-server.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-start.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8'),
]);
assert.match(api,/\/auth\/v1\/user/,'snapshot API must verify the active Supabase user');
assert.match(api,/LAT_YEN_SUPABASE_API_URL/,'snapshot API must avoid host-reserved database URL variables');
assert.match(api,/ly_org_members/,'snapshot API must enforce organization membership');
assert.match(api,/gzipAsync/,'snapshot payload must be compressed');
assert.doesNotMatch(client,/SECRET_KEY|service_role/,'browser bundle must not contain privileged keys');
assert.match(client,/latyen:change-signal/,'fresh changes must bypass a potentially stale mirror');
assert.match(client,/return original\(table,orderColumn,ascending\)/,'Supabase fallback must remain available');
assert.match(mirror,/hour >= 6/,'mirror must pause recurring work from midnight to 06:00');
assert.match(mirror,/LAT_YEN_SUPABASE_API_URL/,'mirror must use its dedicated Supabase API URL');
assert.match(mirror,/updated_at.*created_at/,'mirror must prefer incremental timestamp reads');
assert.match(server,/handleSnapshotApi/,'same-origin server must expose the authenticated snapshot API');
assert.match(api,/\/api\/v1\/activity-events/,'Vibe must expose authenticated notification history');
assert.match(api,/ly_activity_events/,'notification history must be read from Vibe PostgreSQL');
assert.match(start,/startSupabaseMirror/,'production startup must enable the mirror worker');
assert.match(start,/startVibeIposWorker/,'production startup must support direct iPOS-to-Vibe synchronization');
assert.match(ipos,/VIBE_IPOS_BACKFILL_FROM\|\|'2026-08-25'/,'iPOS backfill must cover the requested history');
assert.match(ipos,/rebuildIposInventory/,'iPOS synchronization must reconcile formula inventory idempotently');
assert.doesNotMatch(ipos,/SUPABASE_/,'direct iPOS worker must not depend on Supabase');
assert.match(ipos,/ipos_payment_methods:JSON\.stringify/,'iPOS payment data must be encoded for PostgreSQL jsonb');
assert.match(ipos,/ipos_toppings:JSON\.stringify/,'iPOS topping data must be encoded for PostgreSQL jsonb');
assert.match(bootstrap,/timingSafeEqual/,'one-time credential transfer must authenticate without plain comparison');
assert.match(bootstrap,/aes-256-gcm/,'transferred iPOS credentials must be encrypted at rest');
assert.match(auth,/HttpOnly; Secure; SameSite=Lax/,'Vibe session must use a secure HTTP-only cookie');
assert.match(auth,/bcrypt\.compare/,'Vibe login must verify the migrated password hash');
assert.match(loader,/await load\('vibeReadCache'\)/,'read cache must load before hydration');
assert.match(loader,/ly-vibe-read-cache\.js\?v=20260907\.2/,'loader must request the versioned cache bridge');
assert.match(client,/if\(VIBE_ONLY\)\{state\.source='vibe';throw error;\}/,'Vibe production must never fall back to Supabase reads');
assert.match(client,/\(!VIBE_ONLY&&Date\.now\(\)<state\.bypassUntil\)/,'Vibe invalidation must never bypass into restricted Supabase reads');
assert.match(client,/rows:table=>state\.snapshot\?\.tables\?\.\[table\]/,'assistant must be able to read the current Vibe snapshot');
console.log('Vibe authenticated read-cache contract: PASS');
