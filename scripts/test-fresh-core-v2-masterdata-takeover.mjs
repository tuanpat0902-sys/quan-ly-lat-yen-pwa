import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-masterdata-takeover.js',import.meta.url),'utf8');
const rawCalls=[];
const v2Calls=[];
const rawTable={upsert(payload){rawCalls.push(['upsert',payload]);return Promise.resolve({data:null,error:null});},insert(payload){rawCalls.push(['insert',payload]);return {select(){return this;},single(){return Promise.resolve({data:payload,error:null});}};}};
const client={from(name){rawCalls.push(['from',name]);return rawTable;}};
const masterData={
  async saveWarehouse(row){v2Calls.push(['warehouse',row]);return row;},
  async saveSupplier(row){v2Calls.push(['supplier',row]);return row;},
  async initializeInventory(rows){v2Calls.push(['inventory',rows]);return rows;}
};
const context={
  console,
  Proxy,
  setTimeout(fn){fn();return 1;},
  window:{sb:client,__lyFreshCoreV2:{domains:{masterData}}}
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-fresh-core-v2-masterdata-takeover.js'});

assert.equal(context.window.__lyFreshCoreV2MasterDataTakeover.status().enabled,true);

const warehouse={id:'w1',name:'Kho'};
const wr=await client.from('ly_warehouses').upsert(warehouse);
assert.equal(wr.error,null);
assert.deepEqual(v2Calls.at(-1),['warehouse',warehouse]);

const supplier={id:'s1',name:'NCC'};
const sr=await client.from('ly_suppliers').upsert(supplier);
assert.equal(sr.error,null);
assert.deepEqual(v2Calls.at(-1),['supplier',supplier]);

const inserted=await client.from('ly_suppliers').insert(supplier).select().single();
assert.equal(inserted.data.id,'s1');
assert.deepEqual(v2Calls.at(-1),['supplier',supplier]);

const inventory=[{warehouse_id:'w1',ingredient_id:'i1',quantity:0}];
const ir=await client.from('ly_inventory').upsert(inventory,{onConflict:'org_id,warehouse_id,ingredient_id'});
assert.equal(ir.error,null);
assert.deepEqual(v2Calls.at(-1),['inventory',inventory]);

const rawMutationCalls=rawCalls.filter(([name])=>name==='upsert'||name==='insert');
assert.equal(rawMutationCalls.length,0,'master-data mutations must not double-write through Legacy raw table');
client.from('ly_products');
assert.ok(rawCalls.some(x=>x[0]==='from'&&x[1]==='ly_products'),'non-master tables must pass through');

console.log('Fresh Core V2 master-data takeover: PASS');
