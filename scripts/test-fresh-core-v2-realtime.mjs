import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-realtime.js',import.meta.url),'utf8');
const handlers=[];
const refreshes=[];
const events=[];
let statusHandler=null;
let catchups=0;
const channel={on(type,filter,cb){handlers.push({type,filter,cb});return this;},subscribe(cb){statusHandler=cb;cb('SUBSCRIBED');return this;}};
const client={channel(){return channel;},removeChannel(){}};
const domains={};
for(const name of ['masterData','ingredients','products','imports','exports','stocktake','sales','cashflow','inventory'])domains[name]={async refresh(){refreshes.push(name);}};
const storeState={connectivity:{online:true,realtime:false}};
const core={
  domains,
  async refreshCoreDomains(){catchups++;return [];},
  events:{emit(type,payload){events.push([type,payload]);}},
  store:{getState(){return storeState;},patch(p){Object.assign(storeState,p);}}
};
const context={console,navigator:{onLine:true},setTimeout(fn){fn();return 1;},clearTimeout(){},document:{readyState:'complete',addEventListener(){}},window:{sb:client,__lyFreshOrgId:'org-1',__lyFreshCoreV2:core}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-fresh-core-v2-realtime.js'});
await Promise.resolve();await Promise.resolve();

const api=context.window.__lyFreshCoreV2Realtime;
assert.equal(api.status().enabled,true);
assert.equal(api.status().connected,true);
assert.equal(api.status().catchups,1,'initial realtime subscription must perform one full V2 catch-up');
assert.equal(catchups,1);
assert.equal(handlers.length,17,'must subscribe exactly to V2-owned domain tables');
assert.ok(handlers.every(x=>x.filter.filter==='org_id=eq.org-1'));
assert.equal(api.tableDomain().ly_warehouses,'masterData');
assert.equal(api.tableDomain().ly_suppliers,'masterData');
assert.equal(api.tableDomain().ly_inventory,'inventory');
assert.equal(api.tableDomain().ly_stock_transactions,'inventory');

for(const [table,expected] of [['ly_warehouses','masterData'],['ly_ingredients','ingredients'],['ly_sale_items','sales'],['ly_inventory','inventory'],['ly_stock_transactions','inventory']]){
  const handler=handlers.find(x=>x.filter.table===table);
  await handler.cb({});
  assert.equal(refreshes.at(-1),expected);
}

statusHandler('CHANNEL_ERROR');
assert.equal(api.status().connected,false);
statusHandler('SUBSCRIBED');
await Promise.resolve();await Promise.resolve();
assert.equal(api.status().catchups,2,'reconnect must perform another full V2 catch-up');
assert.equal(catchups,2);
assert.ok(events.some(([type,payload])=>type==='realtime:catchup-complete'&&payload.reason==='reconnected'));

await api.catchUp('manual-test');
assert.equal(api.status().catchups,3);
assert.equal(catchups,3);

assert.equal(source.includes('loadCloud('),false,'V2 realtime must not trigger Legacy full reload');
assert.equal(source.includes('.innerHTML'),false,'V2 realtime must not mutate DOM');
console.log('Fresh Core V2 realtime coordinator + reconnect catch-up: PASS');