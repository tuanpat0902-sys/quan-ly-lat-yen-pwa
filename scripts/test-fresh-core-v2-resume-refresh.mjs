import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-read-takeover.js',import.meta.url),'utf8');
let refreshes=0,loads=0,visibleListener=null;
let phase='ready',orgId='org-1';
const order=[];
const legacyFetch=async()=>[];
const context={
 console,Date,
 navigator:{onLine:true},document:{hidden:false},
 setTimeout(fn){fn();return 1;},clearTimeout(){},
 lyFreshFetch:legacyFetch,
 loadCloud:async()=>{order.push('load');loads++;return {ok:true};},
 window:{
   __lyFreshOrgId:'org-1',lyFreshFetch:legacyFetch,
   __lyFreshCoreV2:{store:{getState(){return {products:[]};}},async refreshCoreDomains(){order.push('refresh');refreshes++;await Promise.resolve();return true;}},
   __lyFreshCoreV2Shadow:{status(){return {phase,orgId};}},
   addEventListener(type,fn,capture){if(type==='visibilitychange'&&capture)visibleListener=fn;},removeEventListener(){},
 }
};
context.window.loadCloud=context.loadCloud;context.globalThis=context;
vm.createContext(context);vm.runInContext(source,context,{filename:'ly-fresh-core-v2-read-takeover.js'});
const api=context.window.__lyFreshCoreV2ReadTakeover;
assert.equal(api.status().enabled,true);assert.equal(typeof visibleListener,'function');
visibleListener();await context.loadCloud();
assert.equal(refreshes,1,'foreground must run one authoritative V2 refresh');
assert.equal(loads,1,'Legacy load mapping must still run once');
assert.deepEqual(order,['refresh','load'],'V2 refresh must finish before Legacy mapping');

let release;context.window.__lyFreshCoreV2.refreshCoreDomains=()=>{refreshes++;order.push('refresh2');return new Promise(r=>{release=r;});};
visibleListener();visibleListener();const pending=context.loadCloud();release();await pending;
assert.equal(refreshes,2,'repeated foreground must share the same pending refresh');assert.ok(api.status().foregroundCoalesced>=1);

context.navigator.onLine=false;visibleListener();await context.loadCloud();assert.equal(refreshes,2);assert.equal(loads,3);
context.navigator.onLine=true;phase='loading';visibleListener();await context.loadCloud();assert.equal(refreshes,2);assert.equal(loads,4);
phase='ready';orgId='other-org';visibleListener();await context.loadCloud();assert.equal(refreshes,2);assert.equal(loads,5);
api.disable();await context.loadCloud();assert.equal(loads,6,'disable must restore prior loadCloud');
console.log('Fresh Core V2 resume refresh: PASS');
