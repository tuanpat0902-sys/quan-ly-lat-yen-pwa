import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-masterdata-takeover.js',import.meta.url),'utf8');
const rawCalls=[];
const v2Calls=[];
let fullLoads=0;
const rawTable={
  upsert(payload){rawCalls.push(['upsert',payload]);return Promise.resolve({data:null,error:null});},
  insert(payload){rawCalls.push(['insert',payload]);return {select(){return this;},single(){return Promise.resolve({data:payload,error:null});}};},
  delete(){rawCalls.push(['delete']);return this;},
  eq(){return this;},
  then(resolve){return Promise.resolve({data:null,error:null}).then(resolve);}
};
const client={from(name){rawCalls.push(['from',name]);return rawTable;}};
const storeState={warehouses:[],suppliers:[],inventoryData:{balances:[],transactions:[]}};
const masterData={
  async saveWarehouse(row){v2Calls.push(['warehouse',row]);storeState.warehouses=[row];return row;},
  async removeWarehouse(id){v2Calls.push(['warehouse-remove',id]);storeState.warehouses=storeState.warehouses.filter(x=>x.id!==id);return {id};},
  async saveSupplier(row){v2Calls.push(['supplier',row]);storeState.suppliers=[row];return row;},
  async initializeInventory(rows){v2Calls.push(['inventory',rows]);return rows;}
};
const inventoryDomain={
  async refresh(){
    const rows=[{warehouse_id:'w1',ingredient_id:'i1',quantity:0}];
    storeState.inventoryData={...storeState.inventoryData,balances:rows};
    v2Calls.push(['inventory-refresh']);
    return storeState.inventoryData;
  }
};
const legacyDb={warehouses:[],suppliers:[],inventory:[]};
async function rawLoadCloud(){fullLoads++;return {full:true};}
const context={
  console,
  Proxy,
  Date,
  db:legacyDb,
  loadCloud:rawLoadCloud,
  setTimeout(fn){fn();return 1;},
  window:{sb:client,loadCloud:rawLoadCloud,__lyFreshCoreV2:{domains:{masterData,inventory:inventoryDomain},store:{getState(){return storeState;}}}}
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-fresh-core-v2-masterdata-takeover.js'});

const api=context.window.__lyFreshCoreV2MasterDataTakeover;
assert.equal(api.status().enabled,true);

const warehouse={id:'w1',name:'Kho'};
const wr=await client.from('ly_warehouses').upsert(warehouse);
assert.equal(wr.error,null);
assert.deepEqual(v2Calls.at(-1),['warehouse',warehouse]);

const inventory=[{warehouse_id:'w1',ingredient_id:'i1',quantity:0}];
const ir=await client.from('ly_inventory').upsert(inventory,{onConflict:'org_id,warehouse_id,ingredient_id'});
assert.equal(ir.error,null);
assert.deepEqual(v2Calls.slice(-2),[['inventory',inventory],['inventory-refresh']]);
const optimizedWarehouseLoad=await context.loadCloud();
assert.equal(optimizedWarehouseLoad.optimized,true,'warehouse save must skip the immediate Legacy full reload');
assert.equal(fullLoads,0);
assert.deepEqual(legacyDb.warehouses,[warehouse]);
assert.deepEqual(legacyDb.inventory,inventory);

const supplier={id:'s1',name:'NCC'};
const sr=await client.from('ly_suppliers').upsert(supplier);
assert.equal(sr.error,null);
assert.deepEqual(v2Calls.at(-1),['supplier',supplier]);
const optimizedSupplierLoad=await context.loadCloud();
assert.equal(optimizedSupplierLoad.optimized,true,'supplier upsert must skip the immediate Legacy full reload');
assert.equal(fullLoads,0);
assert.deepEqual(legacyDb.suppliers,[supplier]);

const insertedSupplier={id:'s2',name:'NCC inline'};
const inserted=await client.from('ly_suppliers').insert(insertedSupplier).select().single();
assert.equal(inserted.data.id,'s2');
assert.deepEqual(v2Calls.at(-1),['supplier',insertedSupplier]);
await context.loadCloud();
assert.equal(fullLoads,1,'supplier insert helper must not suppress a later unrelated full load');

const deleted=await client.from('ly_warehouses').delete().eq('id','w1').eq('org_id','org-1');
assert.equal(deleted.error,null);
assert.deepEqual(v2Calls.at(-1),['warehouse-remove','w1']);
assert.equal(legacyDb.warehouses.length,0,'warehouse delete must hydrate Legacy state');
const optimizedDeleteLoad=await context.loadCloud();
assert.equal(optimizedDeleteLoad.optimized,true,'warehouse delete must skip immediate Legacy full reload');
assert.equal(fullLoads,1);

await context.loadCloud();
assert.equal(fullLoads,2,'manual/subsequent loadCloud must remain available as fallback');

const status=api.status();
assert.equal(status.suppressedFullReloads,3);
assert.ok(status.legacySyncs>=4);

const rawMutationCalls=rawCalls.filter(([name])=>name==='upsert'||name==='insert'||name==='delete');
assert.equal(rawMutationCalls.length,0,'master-data mutations must not double-write through Legacy raw table');
client.from('ly_products');
assert.ok(rawCalls.some(x=>x[0]==='from'&&x[1]==='ly_products'),'non-master tables must pass through');

assert.equal(source.includes('loadCloud()'),false,'optimizer must wrap Legacy loadCloud rather than recursively call it');
console.log('Fresh Core V2 master-data takeover: PASS');
