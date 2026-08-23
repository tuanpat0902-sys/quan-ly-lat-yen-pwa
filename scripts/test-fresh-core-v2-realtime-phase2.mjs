import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-realtime-phase2.js',import.meta.url),'utf8');
const listeners=new Map();
const removed=[];
const legacyCalls=[];
let connected=true;
const client={removeChannel(ch){removed.push(ch);}};
const legacyChannel={id:'legacy-fresh'};
const core={events:{
  on(type,handler){listeners.set(type,handler);return()=>listeners.delete(type);}
}};
const realtime={
  status(){return {connected};},
  enable(){return true;}
};
const context={
  console,
  Date,
  clearTimeout(){},
  setTimeout(fn){fn();return 1;},
  document:{readyState:'complete',addEventListener(){}},
  window:{
    sb:client,
    __lyFreshRealtime:legacyChannel,
    __lyFreshReloadTimer:99,
    __lyFreshCoreV2:core,
    __lyFreshCoreV2Realtime:realtime,
    setupRealtime(){legacyCalls.push('setup');context.window.__lyFreshRealtime={id:`legacy-${legacyCalls.length}`};}
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-fresh-core-v2-realtime-phase2.js'});

const api=context.window.__lyFreshCoreV2RealtimePhase2;
assert.equal(api.status().enabled,true);
assert.equal(api.status().v2Connected,true);
assert.equal(context.window.__lyFreshRealtime,null,'Legacy full-refresh channel must be retired when V2 realtime is connected');
assert.equal(removed.length,1);
assert.equal(context.window.__lyFreshReloadTimer,null,'pending full loadCloud debounce must be cleared');
assert.equal(legacyCalls.length,0,'retirement must not recreate Legacy channel');

context.window.setupRealtime();
assert.equal(legacyCalls.length,0,'Legacy setupRealtime must be suppressed while V2 realtime is connected');
assert.equal(context.window.__lyFreshRealtime,null);

connected=false;
listeners.get('realtime:status')?.({status:'CHANNEL_ERROR',connected:false});
assert.equal(api.status().v2Connected,false);
assert.equal(api.status().phase,'fallback-legacy');
assert.equal(legacyCalls.length,1,'Legacy realtime must be restored if V2 realtime disconnects');
assert.ok(context.window.__lyFreshRealtime);

connected=true;
listeners.get('realtime:status')?.({status:'SUBSCRIBED',connected:true});
assert.equal(context.window.__lyFreshRealtime,null,'Legacy fallback must retire again after V2 reconnects');
assert.equal(removed.length,2);

api.disable();
assert.equal(api.status().enabled,false);
assert.equal(legacyCalls.length,2,'Disabling Phase 2 must restore Legacy fallback');
assert.equal(context.window.setupRealtime.__lyV2RealtimePhase2,undefined,'disable must restore original setupRealtime');

assert.equal(source.includes('loadCloud()'),false,'Phase 2 must not call Legacy full loadCloud itself');
assert.equal(source.includes('V262'),false,'Phase 2 must not modify Smart Row Sync');
console.log('Fresh Core V2 realtime phase 2: PASS');
