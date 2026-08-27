import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');
const bridge=await fs.readFile(new URL('../ly-settings-ui-bridge.js',import.meta.url),'utf8');

assert.match(loader,/settingsUIBridge:\{src:'\.\/ly-settings-ui-bridge\.js\?v=20260827\.2'/,'settings bridge must be owned by module loader');
assert.match(loader,/await load\('settingsUIBridge'\)/,'settings bridge must load before navigation can render Settings');
assert.match(loader,/async function preparePanel/,'panel preparation must be awaitable');
assert.match(loader,/panel==='settings'[\s\S]*await load\('settingsUIBridge'\)[\s\S]*await load\('settingsUI'\)[\s\S]*window\.renderSettings\?\.\(\)/,'Settings navigation must render immediately after lazy modules finish');
assert.match(loader,/window\.__lyNotificationMaster\?\.refresh\?\.\(\)/,'Settings enhancements must reconcile after render');
assert.match(bridge,/pending/,'settings bridge must queue early render calls');
console.log('Settings navigation lazy-load recovery: PASS');
