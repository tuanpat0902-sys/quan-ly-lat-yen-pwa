import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const pkg=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'));
const versionSource=await fs.readFile(new URL('../ly-app-version.js',import.meta.url),'utf8');
const notifications=await fs.readFile(new URL('../ly-inapp-notifications.js',import.meta.url),'utf8');

const match=versionSource.match(/const VERSION='([^']+)'/);
assert.ok(match,'ly-app-version.js must declare a single VERSION constant');
const runtimeVersion=match[1];
assert.equal(pkg.version,runtimeVersion,'package.json and runtime software version must match');
assert.ok(versionSource.includes('lyAppVersionBadge'),'software version must render beside the app brand');
assert.ok(versionSource.includes('Ver ${VERSION}'),'compact Ver label must be used');
assert.ok(versionSource.includes('lat_yen_last_seen_app_version'),'runtime must remember the last seen version for update notices');
assert.ok(notifications.includes('__LY_APP_VERSION_LABEL'),'in-app notifications must use the centralized software version');
assert.ok(notifications.includes('titleWithVersion'),'notification titles must include software version');
assert.ok(notifications.includes('ly-app-version.js'),'notification runtime must load the central version module');
console.log(`App version contract: PASS (Ver ${runtimeVersion})`);
