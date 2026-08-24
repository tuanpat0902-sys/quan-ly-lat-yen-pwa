import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const pkg=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'));
const versionSource=await fs.readFile(new URL('../ly-app-version.js',import.meta.url),'utf8');
const notifications=await fs.readFile(new URL('../ly-inapp-notifications.js',import.meta.url),'utf8');
const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');
const warehouseDeleteUx=await fs.readFile(new URL('../ly-warehouse-delete-ux.js',import.meta.url),'utf8');
const pagesPrep=await fs.readFile(new URL('./prepare-pages-artifact.mjs',import.meta.url),'utf8');

const match=versionSource.match(/const VERSION='([^']+)'/);
assert.ok(match,'ly-app-version.js must declare VERSION');
const runtimeVersion=match[1];
assert.equal(pkg.version,runtimeVersion,'package.json and runtime software version must match');
assert.ok(versionSource.includes("getElementById?.('appNameText')"),'version runtime must target the actual app-name element');
assert.ok(versionSource.includes("getElementById?.('appVersionStatic')"),'version runtime must own the static version badge');
assert.ok(versionSource.includes('Ver ${VERSION}'),'compact Ver label must be used');
assert.ok(versionSource.includes('lat_yen_last_seen_app_version'),'update notice must remember last seen version');
assert.ok(loader.includes(`ly-app-version.js?v=${runtimeVersion}`),'module loader must bootstrap current version independently of SW freshness');
assert.ok(loader.includes('ly-warehouse-delete-ux.js?v=20260824.2'),'module loader must bootstrap current warehouse security UX');
assert.ok(warehouseDeleteUx.includes("ly_delete_warehouse_secure"),'warehouse deletion must use the transactional secure RPC');
assert.ok(warehouseDeleteUx.includes('Nhập chính xác tên kho'),'warehouse UX must require an explicit destructive confirmation');
assert.ok(notifications.includes('__LY_APP_VERSION_LABEL'),'notifications must use centralized runtime version label');
assert.ok(pagesPrep.includes(`APP_VERSION='${runtimeVersion}'`),'Pages artifact preparation must use the current version');
assert.ok(pagesPrep.includes('appVersionStatic'),'Pages artifact must replace the old V274 badge');
assert.ok(pagesPrep.includes("updateViaCache:'none'"),'Pages artifact must bypass HTTP cache for service-worker updates');
console.log(`App version contract: PASS (Ver ${runtimeVersion})`);
