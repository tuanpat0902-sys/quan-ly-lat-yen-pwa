import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-realtime.js',import.meta.url),'utf8');
const handlers=[];
const refreshes=[];
const events=[];
let statusHandler=null;
let batchCallback=null;
let projectionCallback=null;
let catchups=0;
let hydrations=0;
let safeRenders=0;
let fallbackRenders=0;
let deferRender=false;
let draftOpen=false;

const channel={on(type,filter,callback){handlers.push({type,filter,callback});return this;},subscribe(callback){statusHandler=callback;callback('SUBSCRIBED');return this;}};
const client={channel(){return channel;},removeChannel(){}};
const domains={};
for(const name of ['masterData','ingredients','products','imports','exports','stocktake','sales','cashflow','inventory'])domains[name]={async refresh(){refreshes.push(name);}};
const storeState={connectivity:{online:true,realtime:false}};
const core={
  domains,
  async refreshCoreDomains(){catchups++;return [];},
  events:{emit(type,payload){events.push([type,payload]);}},
  store:{getState(){return storeState;},patch(patch){Object.assign(storeState,patch);}}
};

const context={
  console,
  Date,
  navigator:{onLine:true},
  setTimeout(callback,delay){if(delay===260){batchCallback=callback;return 260;}if(delay===700){projectionCallback=callback;return 700;}callback();return 1;},
  clearTimeout(){},
  document:{readyState:'complete',addEventListener(){}},
  window:{
    sb:client,
    __lyFreshOrgId:'org-1',
    __lyFreshCoreV2:core,
    __lyFreshCoreV2Shadow:{status(){return {phase:'ready',refreshAt:Date.now()};}},
    __lyFreshCoreV2LegacyHydration:{hydrate(snapshot){assert.equal(snapshot,storeState);hydrations++;return true;}},
    v240HasActiveDraft(){return draftOpen;},
    v240MarkProjectionDeferred(){},
    v235RequestBackgroundRender(){safeRenders++;return !deferRender;},
    renderAll(){fallbackRenders++;}
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-fresh-core-v2-realtime.js'});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
await flush();

const api=context.window.__lyFreshCoreV2Realtime;
assert.equal(api.status().enabled,true);
assert.equal(api.status().connected,true);
assert.equal(api.status().catchups,1);
assert.equal(api.status().catchupSkips,1,'fresh Shadow data must avoid a duplicate full startup refresh');
assert.equal(catchups,0,'initial subscription must reuse the just-loaded Shadow snapshot');
assert.equal(hydrations,1);
assert.equal(safeRenders,1);
assert.equal(fallbackRenders,0,'Realtime must use the interaction-safe Legacy renderer');
assert.equal(handlers.length,17,'must subscribe exactly to V2-owned domain tables');
assert.ok(handlers.every(item=>item.filter.filter==='org_id=eq.org-1'));

for(const table of ['ly_warehouses','ly_ingredients','ly_sale_items','ly_inventory','ly_stock_transactions']){
  handlers.find(item=>item.filter.table===table).callback({});
}
assert.equal(api.status().events,5);
assert.equal(api.status().coalescedEvents,4,'events arriving together must be coalesced');
assert.equal(typeof batchCallback,'function');
await batchCallback();
await flush();
assert.deepEqual([...new Set(refreshes)].sort(),['ingredients','inventory','masterData','sales']);
assert.equal(refreshes.length,4,'duplicate inventory table events must refresh the inventory domain once');
assert.equal(api.status().batches,1);
assert.equal(api.status().projections,2,'one realtime batch must produce one visible projection');
assert.equal(hydrations,2);
assert.equal(safeRenders,2);

deferRender=true;
handlers.find(item=>item.filter.table==='ly_cashflow_entries').callback({});
await batchCallback();
await flush();
assert.equal(api.status().deferredRenders,1,'active editing must defer the render instead of rebuilding the form');

deferRender=false;
draftOpen=true;
const beforeDraftHydrations=hydrations,beforeDraftRenders=safeRenders;
handlers.find(item=>item.filter.table==='ly_cashflow_entries').callback({});
await batchCallback();
await flush();
assert.equal(hydrations,beforeDraftHydrations,'an open receipt must block realtime hydration');
assert.equal(safeRenders,beforeDraftRenders,'an open receipt must not be rebuilt by realtime');
assert.ok(api.status().deferredProjections>=1);
assert.equal(typeof projectionCallback,'function');
draftOpen=false;
projectionCallback();
assert.equal(hydrations,beforeDraftHydrations+1,'deferred realtime data must project once after the receipt closes');
assert.equal(safeRenders,beforeDraftRenders+1);

statusHandler('CHANNEL_ERROR');
assert.equal(api.status().connected,false);
statusHandler('SUBSCRIBED');
await flush();
assert.equal(api.status().catchups,2);
assert.equal(catchups,1,'reconnect must perform one authoritative full catch-up');
assert.ok(events.some(([type,payload])=>type==='realtime:catchup-complete'&&payload.reason==='reconnected'));

await api.catchUp('manual-test');
assert.equal(api.status().catchups,3);
assert.equal(catchups,2);
assert.equal(source.includes('loadCloud('),false,'V2 realtime must not trigger Legacy full reload');
assert.equal(source.includes('.innerHTML'),false,'V2 realtime must not mutate DOM directly');
console.log('Fresh Core V2 realtime batching + active-panel projection: PASS');
