import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFile(new URL(path,root),'utf8');
const [index,loader,pages,sw,center,data,inApp,cloud,realtime,performance]=await Promise.all([
  read('index.html'),read('ly-module-loader.js'),read('scripts/prepare-pages-artifact.mjs'),read('sw.js'),
  read('ly-notification-center.js'),read('ly-data-notifications.js'),read('ly-inapp-notifications.js'),
  read('ly-cloud-realtime.js'),read('ly-fresh-core-v2-realtime.js'),read('ly-performance-optimizer.js')
]);

const modules=['ly-inapp-notifications.js','ly-data-notifications.js','ly-notification-center.js','ly-cloud-realtime.js'];
for(const file of modules){
  assert.ok(loader.includes(file),`module loader must restore ${file}`);
  assert.ok(!sw.includes(file),`non-critical experience module must stay outside the service-worker precache: ${file}`);
}
assert.match(pages,/no duplicated module-owned bootstrap/,'Pages artifact must keep notification modules under the single module-loader owner');
assert.ok(loader.includes("load('notificationCenter')"),'notification center must load in the core experience chain');
assert.ok(center.includes('lyNotificationButton')&&center.includes('lyNotificationOverlay')&&center.includes('ly-notify-panel'),'notification center UI contract is incomplete');
assert.match(center,/VERSION='2026\.09\.08\.1'/,'Vibe notification center release is missing');
assert.match(center,/api\/v1\/activity-events/,'notification center must read activity history from Vibe');
assert.match(center,/\(VIBE_ONLY\|\|!state\.fullLoaded\)/,'opening the Vibe notification center must refresh recent activity');
assert.match(data,/api\/v1\/activity-events/,'notification polling must read activity deltas from Vibe');
assert.match(center,/height:min\(52dvh,480px\)/,'desktop notification center must remain near half a viewport tall');
assert.match(center,/height:min\(50dvh,430px\)/,'mobile notification center must remain near half a viewport tall');
assert.match(center,/\.ly-notify-list\{min-height:0;overflow-y:auto;overflow-x:hidden/,'notification list must keep internal vertical scrolling without horizontal overflow');
assert.ok(data.includes('ly_activity_events')&&data.includes('latyen:activity')&&data.includes('latyen:change-signal'),'activity notification broker/delta contract is incomplete');
assert.ok(inApp.includes('__lyInAppNotifications'),'in-app toast API is missing');
assert.ok(cloud.includes('ly-cloud-orbit')&&cloud.includes('ly-realtime-live'),'modern Cloud + Realtime indicator is missing');
assert.match(cloud,/if\(VIBE_ONLY\)[\s\S]*realtime:false,smartSync:false,vibe:true/,'Vibe status must ignore disconnected legacy Realtime state');
assert.match(cloud,/return 'Vibe • Đã đồng bộ'/,'Vibe status must settle after snapshot completion');
assert.match(index,/if\(location\.hostname\.endsWith\('\.tinhgon\.xyz'\)\)\{[\s\S]{0,180}Vibe • Đã đồng bộ/,'Vibe production must not start legacy Realtime');
assert.match(loader,/ly-performance-optimizer\.js\?v=20260907\.1/,'Vibe-aware adaptive scheduler version is missing');
assert.match(performance,/if\(VIBE_ONLY\)\{if\(typeof window\.loadCloud==='function'\)await window\.loadCloud\(\);\}/,'Vibe scheduler must refresh snapshots instead of running legacy sync cycles');
assert.ok(cloud.includes('latyen:v2-realtime-status'),'Cloud indicator is not connected to V2 realtime status');
assert.ok(realtime.includes("CustomEvent('latyen:v2-realtime-status'"),'V2 realtime must publish its visual connection state');
assert.ok(index.includes("'.inline-import-form.open'")&&index.includes('v240HasActiveDraft'),'open receipt protection is missing from the shell');
console.log('Notification center + Cloud Realtime + open-draft experience: PASS');
