import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const [security,loader,pages,sw,migration]=await Promise.all([
  fs.readFile(new URL('ly-menu-security.js',root),'utf8'),
  fs.readFile(new URL('ly-module-loader.js',root),'utf8'),
  fs.readFile(new URL('scripts/prepare-pages-artifact.mjs',root),'utf8'),
  fs.readFile(new URL('sw.js',root),'utf8'),
  fs.readFile(new URL('supabase/migrations/20260823_add_protected_menu_password.sql',root),'utf8')
]);

for(const id of ['ingredients','recipes','finance','employees','warehouses','history'])assert.ok(security.includes(`'${id}'`),`protected menu missing: ${id}`);
for(const rpc of ['ly_menu_password_status','ly_verify_menu_password','ly_set_menu_password','ly_disable_menu_password']){
  assert.ok(security.includes(rpc),`security runtime missing RPC: ${rpc}`);
  assert.ok(migration.includes(rpc),`security migration missing RPC: ${rpc}`);
}
assert.match(security,/VERSION='2026\.08\.24\.3'/);
assert.ok(security.includes("window.addEventListener?.('latyen:v2-hydrated'"),'security settings card must recover after hydration');
assert.ok(security.includes('if(settingsActive())render(false)'),'security settings card must survive settings-panel renders');
assert.ok(loader.includes("menuSecurity:{src:'./ly-menu-security.js?v=20260824.3'"),'module loader must fetch menu security');
assert.ok(loader.includes("await load('menuSecurity')"),'module loader must activate menu security');
assert.ok(pages.includes('<script src="./ly-menu-security.js?v=20260824.3"></script>'),'Pages fallback runtime must include menu security');
assert.ok(sw.includes("'./ly-menu-security.js'"),'service worker must precache menu security');
console.log('Protected-menu password runtime contract: PASS (6 menus)');
