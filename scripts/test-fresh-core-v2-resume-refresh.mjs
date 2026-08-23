import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-read-takeover.js',import.meta.url),'utf8');
let refreshes=0,loads=0,hydrations=0,renders=0,visibleListener=null;
let phase='ready',orgId='org-1';
const order=[];
const legacyFetch=async()=>[];
const snapshot={products:[]};
const context={
 console,Date,
 navigator:{onLine:true},document:{hidden:false},
 setTimeout(fn){fn();return 1;},clearTimeout(){},
 lyFreshFetch:legacyFetch,
 loadCloud:async()=>{order.push('load');loads++;return {ok:true};},
 invalidateDerivedCaches(){order.push('invalidate');},cacheSave(){order.push('cache');},flushCacheSave(){order.push('flush');},renderAll(){order.push('render');renders++;},updatePendingSyncBadge(){order.push('badge');},
 window:{
   __lyFreshOrgId:'org-1',lyFreshFetch:legacyFetch,
   __lyFreshCoreV2:{store:{getState(){return snapshot;}},async refreshCoreDomains(){order.push('refresh');refreshes++;await Promise.resolve();return true;}},
   __lyFreshCoreV2LegacyHydration:{hydrate(input){assert.equal(input,snapshot);order.push('hydrate');hydrations++;return true;}},
   __lyFreshCoreV2Shadow:{status(){return {phase,orgId};}},
   addEventListener(type,fn,capture){if(type==='visibilitychange'&&capture)visibleListener=fn;},removeEventListener(){},
 }
};
context.window.loadCloud=context.loadCloud;context.globalThis=context;
vm.createContext(context);vm.runInContext(source,context,{filename:'ly-fresh-core-v2-read-takeover.js'});
const api=context.window.__lyFreshCoreV2ReadTakeover;
assert.equal(api.status().enabled,true);assert.equal(typeof visibleListener,'function');
visibleListener();const first=await context.loadCloud();
assert.equal(refreshes,1);assert.equal(hydrations,1);assert.equal(loads,0,'foreground fast-path must bypass Legacy loadCloud mapping');assert.equal(renders,1);assert.equal(first.fastPath,'foreground-hydration');
assert.deepEqual(order,['refresh','hydrate','invalidate','cache','flush','render','badge']);assert.equal(api.status().foregroundFastPaths,1);

let release;context.window.__lyFreshCoreV2.refreshCoreDomains=()=>{refreshes++;order.push('refresh2');return new Promise(r=>{release=r;});};
visibleListener();visibleListener();const pending=context.loadCloud();await Promise.resolve();assert.equal(typeof release,'function');release();await pending;
assert.equal(refreshes,2,'repeated foreground must share one pending refresh');assert.equal(hydrations,2);assert.equal(loads,0);assert.ok(api.status().foregroundCoalesced>=1);

context.navigator.onLine=false;visibleListener();await context.loadCloud();assert.equal(loads,1,'offline must keep Legacy fallback');
context.navigator.onLine=true;phase='loading';visibleListener();await context.loadCloud();assert.equal(loads,2,'not-ready V2 must keep Legacy fallback');
phase='ready';orgId='other-org';visibleListener();await context.loadCloud();assert.equal(loads,3,'org mismatch must keep Legacy fallback');

orgId='org-1';delete context.renderAll;visibleListener();await context.loadCloud();assert.equal(loads,4,'missing render hook must fall back to Legacy loadCloud');assert.equal(api.status().foregroundLegacyFallbacks,1);
api.disable();await context.loadCloud();assert.equal(loads,5,'disable must restore prior loadCloud');
console.log('Fresh Core V2 foreground hydration fast-path: PASS');
