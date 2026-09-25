import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFile(new URL(path,root),'utf8');
const [index,cache,writes,performance,notifications,loader]=await Promise.all([
  read('index.html'),read('ly-vibe-read-cache.js'),read('ly-vibe-business-writes.js'),
  read('ly-performance-optimizer.js'),read('ly-data-notifications.js'),read('ly-module-loader.js')
]);

assert.match(cache,/if\(!options\.allowDraftApply&&draftActive\(\)\)/,'an open business form must defer every ordinary Cloud projection');
assert.match(cache,/if\(!options\.allowInteractionApply&&interactionActive\(\)\)/,'every automatic or legacy refresh must yield while the user is interacting');
assert.match(cache,/queueRefresh\(options\.reason\|\|'active-draft'\)/,'deferred refresh must resume after the form closes');
assert.match(index,/beforeRevision=window\.__lyVibeReadCache\?\.revisionToken/,'Cloud refresh must capture the projected domain revision');
assert.match(index,/afterRevision===beforeRevision[\s\S]{0,180}notModified:true/,'an unchanged snapshot must not rebuild the active panel');
assert.match(index,/if\(!background\)\{[\s\S]{0,160}lyFreshBusy\(true/,'background reads must not display the blocking sync progress UI');
assert.match(index,/if\(options\.render!==false\)[\s\S]{0,220}v219SafeBackgroundRender/,'background data changes must use the interaction-safe renderer');
assert.match(index,/loadCloud\(\{reason:'online',background:true\}\)/,'network resume must be a non-blocking background refresh');
assert.match(index,/loadCloud\(\{reason:'visible',background:true\}\)/,'window resume must be a non-blocking background refresh');
assert.match(cache,/source!=='vibe-write'[\s\S]{0,260}reason:'change-signal',background:true/,'remote change signals must coalesce into one safe background refresh');
assert.match(cache,/function revisionToken\(\)/,'the bounded domain cache must expose a stable revision token');
assert.match(writes,/reason:'confirmed-write',allowDraftApply:true,allowInteractionApply:true,render:false,forceApply:true,background:true/,'confirmed writes must refresh data without rebuilding or deadlocking the still-open form');
assert.match(writes,/syncEmployees\(\)[\s\S]{0,600}#employees\.panel\.active[\s\S]{0,180}v219InteractionActive[\s\S]{0,120}v240DeferOpenFormRender/,'late employee reads must not replace an employee form or report input in use');
assert.match(index,/function v219ActivePanel\(\)[\s\S]{0,220}'\.panel\.active'[\s\S]{0,160}activePanelId=p/,'background rendering must follow the panel that is actually visible');
assert.match(index,/function v219RenderVisiblePanel\(\)[\s\S]{0,300}scrollTo\(x,y\)/,'background rendering must preserve the user reading position');
assert.match(performance,/loadCloud\(\{reason:'adaptive-scheduler',background:true\}\)/,'the adaptive scheduler must never invoke a foreground Cloud load');
assert.match(notifications,/source:'activity-events'/,'activity polling must signal remote data changes');
for(const marker of ['ly-vibe-read-cache.js?v=20260925.2','ly-vibe-business-writes.js?v=20260925.2','ly-performance-optimizer.js?v=20260924.1','ly-data-notifications.js?v=20260924.1'])assert.ok(loader.includes(marker),`missing deterministic runtime asset: ${marker}`);

console.log('Vibe interaction-safe synchronization and load coordination: PASS');
