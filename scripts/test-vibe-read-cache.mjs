import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [client,api,ipos,bootstrap,auth,server,start,loader,index,compat]=await Promise.all([
  fs.readFile(new URL('../ly-vibe-read-cache.js',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-snapshot-api.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-ipos-worker.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-ipos-bootstrap.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-auth-api.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-static-server.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-start.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../index.html',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-vibe-client-compat.js',import.meta.url),'utf8'),
]);
assert.match(api,/authenticatedVibeUser\(request\)/,'snapshot API must verify the active Vibe session');
assert.match(api,/vibeUser\.orgId !== orgId/,'snapshot API must enforce organization membership');
assert.doesNotMatch(api,/Supabase|SUPABASE|\/auth\/v1\/user/,'snapshot API must not contact Supabase');
assert.match(api,/gzipAsync/,'snapshot payload must be compressed');
assert.doesNotMatch(client,/SECRET_KEY|service_role/,'browser bundle must not contain privileged keys');
assert.match(client,/latyen:change-signal/,'fresh changes must bypass a potentially stale mirror');
assert.match(client,/if\(VIBE_ONLY\)\{state\.source='vibe';[\s\S]*throw error;\}/,'Vibe production must never fall back to retired reads');
assert.doesNotMatch(start,/startSupabaseMirror|vibehost-supabase-mirror/,'production startup must remain Vibe-only');
assert.doesNotMatch(loader,/supabaseBootstrap|ly-supabase-bootstrap/,'browser startup must remain Vibe-only');
assert.doesNotMatch(index,/cdn\.jsdelivr\.net\/npm\/@supabase|supabase-js@/,'page must not load the Supabase SDK');
assert.doesNotMatch(index,/SUPABASE_URL|SUPABASE_KEY|sb_publishable_/,'browser source must not embed retired Supabase project credentials');
assert.match(api,/expiresAt: Date\.now\(\) \+ 60_000/,'unchanged full snapshots must be reused for one minute');
assert.match(client,/Date\.now\(\)-cached\.loadedAt<60_000/,'the browser must reuse each domain for one minute');
assert.match(client,/\/api\/v1\/domains\/\$\{domain\}/,'the browser must load bounded domain snapshots');
assert.doesNotMatch(client,/fetch\(`\/api\/v1\/snapshot/,'the browser must not load the retired all-table snapshot');
assert.match(compat,/\/api\/auth\/session/,'compatibility auth must use the same-origin Vibe session');
assert.match(server,/handleSnapshotApi/,'same-origin server must expose the authenticated snapshot API');
assert.match(api,/\/api\/v1\/activity-events/,'Vibe must expose authenticated notification history');
assert.match(api,/ly_activity_events/,'notification history must be read from Vibe PostgreSQL');
assert.match(start,/startVibeIposWorker/,'production startup must support direct iPOS-to-Vibe synchronization');
assert.match(ipos,/VIBE_IPOS_BACKFILL_FROM\|\|'2026-08-25'/,'iPOS backfill must cover the requested history');
assert.match(ipos,/rebuildVibeIposInventory/,'iPOS synchronization must reconcile formula inventory idempotently');
assert.match(ipos,/syncSaleActivityEvents/,'direct iPOS synchronization must populate Vibe notifications');
assert.match(ipos,/not exists\([\s\S]*entity_table='ly_sales'/,'iPOS notification writes must remain idempotent');
assert.doesNotMatch(ipos,/SUPABASE_/,'direct iPOS worker must not depend on Supabase');
assert.match(ipos,/ipos_payment_methods:JSON\.stringify/,'iPOS payment data must be encoded for PostgreSQL jsonb');
assert.match(ipos,/ipos_toppings:JSON\.stringify/,'iPOS topping data must be encoded for PostgreSQL jsonb');
assert.match(bootstrap,/timingSafeEqual/,'one-time credential transfer must authenticate without plain comparison');
assert.match(bootstrap,/aes-256-gcm/,'transferred iPOS credentials must be encrypted at rest');
assert.match(auth,/HttpOnly; Secure; SameSite=Lax/,'Vibe session must use a secure HTTP-only cookie');
assert.match(auth,/bcrypt\.compare/,'Vibe login must verify the migrated password hash');
assert.match(loader,/await load\('vibeReadCache'\)/,'read cache must load before hydration');
assert.match(loader,/ly-vibe-read-cache\.js\?v=20260922\.1/,'loader must request the versioned cache bridge');
assert.match(client,/captureVersions\(next\.tables\)/,'authoritative row versions must be captured before UI projection can mutate rows');
assert.match(client,/versionFor:\(table,id\)/,'business writes must be able to read an immutable server version');
assert.match(api,/for\(const table of tables\)/,'a snapshot must reuse one database connection instead of exhausting the pool');
assert.match(client,/\[502,503,504\]/,'temporary snapshot failures must be retried');
assert.match(client,/if\(VIBE_ONLY\)\{state\.source='vibe';[\s\S]*throw error;\}/,'Vibe production must never fall back to Supabase reads');
assert.match(client,/\(!VIBE_ONLY&&Date\.now\(\)<state\.bypassUntil\)/,'Vibe invalidation must never bypass into restricted Supabase reads');
assert.match(client,/cached\?\.orgId===String\(window\.__lyFreshOrgId\|\|''\)\?cached\.tables\?\.\[table\]/,'assistant must only read the current organization domain');
assert.match(index,/!e\.warehouse_id\|\|!warehouseIds\.has\(String\(e\.warehouse_id\)\)/,'orphaned employee records must be reattached to the active warehouse');
console.log('Vibe authenticated read-cache contract: PASS');
