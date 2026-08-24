import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFile(new URL(path,root),'utf8');
const [index,loader,pages,sw,center,data,inApp,cloud,realtime]=await Promise.all([
  read('index.html'),read('ly-module-loader.js'),read('scripts/prepare-pages-artifact.mjs'),read('sw.js'),
  read('ly-notification-center.js'),read('ly-data-notifications.js'),read('ly-inapp-notifications.js'),
  read('ly-cloud-realtime.js'),read('ly-fresh-core-v2-realtime.js')
]);

const modules=['ly-inapp-notifications.js','ly-data-notifications.js','ly-notification-center.js','ly-cloud-realtime.js'];
for(const file of modules){
  assert.ok(loader.includes(file),`module loader must restore ${file}`);
  assert.ok(pages.includes(file),`Pages artifact must restore ${file}`);
  assert.ok(sw.includes(file),`service worker must precache ${file}`);
}
assert.ok(loader.includes("await load('notificationCenter')"),'notification center must load in the core experience chain');
assert.ok(center.includes('lyNotificationButton')&&center.includes('lyNotificationOverlay')&&center.includes('ly-notify-panel'),'notification center UI contract is incomplete');
assert.ok(data.includes('ly_activity_events')&&data.includes('latyen:activity'),'activity notification realtime contract is incomplete');
assert.ok(inApp.includes('__lyInAppNotifications'),'in-app toast API is missing');
assert.ok(cloud.includes('ly-cloud-orbit')&&cloud.includes('ly-realtime-live'),'modern Cloud + Realtime indicator is missing');
assert.ok(cloud.includes('latyen:v2-realtime-status'),'Cloud indicator is not connected to V2 realtime status');
assert.ok(realtime.includes("CustomEvent('latyen:v2-realtime-status'"),'V2 realtime must publish its visual connection state');
assert.ok(index.includes("'.inline-import-form.open'")&&index.includes('v240HasActiveDraft'),'open receipt protection is missing from the shell');
console.log('Notification center + Cloud Realtime + open-draft experience: PASS');
