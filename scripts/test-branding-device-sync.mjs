import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [branding,index,loader,migration]=await Promise.all([
  fs.readFile(new URL('../ly-branding-sync.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../index.html',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../supabase/migrations/20260823_org_branding_sync.sql',import.meta.url),'utf8')
]);

assert.match(branding,/VERSION='2026\.09\.01\.1'/);
assert.match(branding,/RECHECK_MS=900000/,'unchanged branding must be served from local cache for 15 minutes');
assert.match(branding,/localStorage\.setItem\('lat_yen_app_brand_v1',[\s\S]*name,logo:logo\|\|''/,'cloud branding must update the legacy render source on every device');
assert.match(branding,/if\(state\.saving\)\{state\.pendingSave=\{forceLogo\};return true;\}/,'rapid logo changes must queue the latest cloud write');
assert.match(branding,/const next=state\.pendingSave;state\.pendingSave=null;if\(next\)queueMicrotask/,'queued logo write must run after the active save');
assert.match(branding,/latyen:local-branding-changed[\s\S]*persist\(event\?\.detail\?\.logoData\)/,'cloud save must start only after local image processing completes');
assert.doesNotMatch(branding,/input\[type="file"\][\s\S]*setTimeout\(\(\)=>persist\(undefined\),250\)/,'file selection must not race the image decoder');
assert.match(index,/Đã thêm logo[\s\S]*latyen:local-branding-changed[\s\S]*logoData:logo/);
assert.match(index,/Đã xóa logo[\s\S]*latyen:local-branding-changed[\s\S]*logoData:null/);
assert.match(loader,/ly-branding-sync\.js\?v=20260901\.1/);
assert.match(migration,/alter table public\.ly_org_branding enable row level security/);
assert.match(migration,/for update[\s\S]*using \(org_id = ly_private\.ly_current_org\(\) and ly_private\.ly_is_admin\(\)\)[\s\S]*with check/,'branding update must retain organization-scoped admin RLS');
assert.match(migration,/alter publication supabase_realtime add table public\.ly_org_branding/,'branding changes must remain enabled for Realtime');

console.log('Cross-device cloud branding and logo synchronization: PASS');
