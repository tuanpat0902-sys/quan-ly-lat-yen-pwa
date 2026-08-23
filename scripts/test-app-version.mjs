import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const pkg=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'));
const versionSource=await fs.readFile(new URL('../ly-app-version.js',import.meta.url),'utf8');
const notifications=await fs.readFile(new URL('../ly-inapp-notifications.js',import.meta.url),'utf8');
const sw=await fs.readFile(new URL('../sw.js',import.meta.url),'utf8');

const match=versionSource.match(/const VERSION='([^']+)'/);
assert.ok(match,'ly-app-version.js must declare a single VERSION constant');
const runtimeVersion=match[1];
assert.equal(pkg.version,runtimeVersion,'package.json and runtime software version must match');
assert.ok(versionSource.includes('lyAppVersionBadge'),'software version must render beside the app brand');
assert.ok(versionSource.includes('Ver ${VERSION}'),'compact Ver label must be used');
assert.ok(versionSource.includes('lat_yen_last_seen_app_version'),'runtime must remember the last seen version for update notices');
assert.ok(notifications.includes('__LY_APP_VERSION_LABEL'),'in-app notifications must use the centralized software version');
assert.ok(notifications.includes('titleWithVersion'),'notification titles must include software version');
assert.ok(notifications.includes(`ly-app-version.js?v=${runtimeVersion}`),'notification runtime must request the current app-version module');
assert.ok(sw.includes("const APP_VERSION_SCRIPT='./ly-app-version.js'"),'service worker must precache the app-version runtime');
assert.ok(sw.includes('APP_VERSION_SCRIPT,INAPP_SCRIPT'),'service worker asset list must include app-version before in-app notifications');
assert.ok(sw.includes(`ly-app-version.js?v=${runtimeVersion}`),'service worker must inject the current app-version runtime');
assert.ok(sw.includes("fresh-core-50"),'version rollout must bump the service worker cache');
console.log(`App version contract: PASS (Ver ${runtimeVersion})`);
