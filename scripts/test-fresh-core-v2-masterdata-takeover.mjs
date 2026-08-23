import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-masterdata-takeover.js',import.meta.url),'utf8');
const rawCalls=[];
const v2Calls=[];
let fullLoads=0,ingredientRenders=0,renderAlls=0,derivedInvalidations=0,indexInvalidations=0,warehouseSelectRenders=0;
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
    const rows=storeState.warehouses.length?[{warehouse_id:storeState.warehouses[0].id,ingredient_id:'i1',quantity:0}]:[];
    storeState.inventoryData={...storeState.inventoryData,balances:rows};
    v2Calls.push(['inventory-refresh']);
    return storeState.inventoryData;
  }
};
const legacyDb={warehouses:[],suppliers:[],inventory:[]};
async function rawLoadCloud(){fullLoads++;return {full:true};}
const context={
  console,Proxy,Date,db:legacyDb,loadCloud:rawLoadCloud,
  currentWarehouseId:'w1',
  localStorage:{setItem(){}},
  invalidateDataIndexes(){indexInvalidations++;},
  invalidateDerivedCaches(){derivedInvalidations++;},
  renderWarehouseSelect(){warehouseSelectRenders++;},
  renderIngredients(){ingredientRenders++;},
  renderAll(){renderAlls++;},
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
const inventory=[{warehouse_id:'w1',ingredient_id:'i1',quantity:0}];
const ir=await client.from('ly_inventory').upsert(inventory,{onConflict:'org_id,warehouse_id,ingredient_id'});
assert.equal(ir.error,null);
const optimizedWarehouseLoad=await context.loadCloud();
assert.equal(optimizedWarehouseLoad.optimized,true);
assert.equal(fullLoads,0);
assert.equal(legacyDb.warehouses.length,1);
assert.equal(legacyDb.warehouses[0].id,'w1');
assert.equal(legacyDb.warehouses[0].name,'Kho');
assert.equal(legacyDb.inventory.length,1);
assert.equal(legacyDb.inventory[0].warehouse_id,'w1');
assert.equal(legacyDb.inventory[0].ingredient_id,'i1');
assert.equal(Number(legacyDb.inventory[0].quantity),0);
assert.equal(indexInvalidations,1,'warehouse change must invalidate data indexes used by warehouseIngredients');
assert.equal(derivedInvalidations,1);
assert.equal(warehouseSelectRenders,1);
assert.equal(renderAlls,1,'warehouse change must re-render all warehouse-scoped projections');

const supplier={id:'s1',name:'NCC'};
await client.from('ly_suppliers').upsert(supplier);
await context.loadCloud();
assert.equal(legacyDb.suppliers.length,1);
assert.equal(legacyDb.suppliers[0].id,'s1');
assert.equal(legacyDb.suppliers[0].name,'NCC');

const insertedSupplier={id:'s2',name:'NCC inline'};
const inserted=await client.from('ly_suppliers').insert(insertedSupplier).select().single();
assert.equal(inserted.data.id,'s2');
await context.loadCloud();
assert.equal(fullLoads,1,'supplier insert helper must not suppress a later unrelated full load');

const deleted=await client.from('ly_warehouses').delete().eq('id','w1').eq('org_id','org-1');
assert.equal(deleted.error,null);
assert.ok(v2Calls.some(x=>x[0]==='warehouse-remove'&&x[1]==='w1'));
assert.equal(v2Calls.at(-1)[0],'inventory-refresh','warehouse delete must refresh inventory domain after child cleanup');
assert.equal(legacyDb.warehouses.length,0);
assert.equal(legacyDb.inventory.length,0);
const optimizedDeleteLoad=await context.loadCloud();
assert.equal(optimizedDeleteLoad.optimized,true);
assert.equal(fullLoads,1);
assert.ok(indexInvalidations>=3,'delete must invalidate data indexes again');

await context.loadCloud();
assert.equal(fullLoads,2);
const status=api.status();
assert.equal(status.suppressedFullReloads,3);
assert.ok(status.legacySyncs>=4);
assert.ok(status.legacyRenders>=3);

const rawMutationCalls=rawCalls.filter(([name])=>name==='upsert'||name==='insert'||name==='delete');
assert.equal(rawMutationCalls.length,0,'master-data mutations must not double-write through Legacy raw table');
client.from('ly_products');
assert.ok(rawCalls.some(x=>x[0]==='from'&&x[1]==='ly_products'));
assert.equal(source.includes('loadCloud()'),false);
console.log('Fresh Core V2 master-data takeover: PASS');
