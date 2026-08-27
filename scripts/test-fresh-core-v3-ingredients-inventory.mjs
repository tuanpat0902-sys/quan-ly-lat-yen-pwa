import assert from 'node:assert/strict';
import {createIngredientsInventoryRepository,createIngredientsInventoryService} from '../src-v3/domains/ingredients-inventory/index.js';

const data={ingredients:[{id:'i1',name:'Coffee'}],inventory:[{id:'x1',ingredient_id:'i1',quantity:2}]};
const gateway={async selectPage(table){return {rows:data[table]||[],count:(data[table]||[]).length}}};
const repository=createIngredientsInventoryRepository({gateway});
const cacheMap=new Map();
const cache={set:(k,v)=>cacheMap.set(k,{value:v}),get:k=>cacheMap.get(k)};
const events={emit(){}};
const service=createIngredientsInventoryService({repository,cache,events,v2Adapter:{getState:()=>data}});
const result=await service.refreshShadow();
assert.equal(result.parityReady,true);
assert.equal(service.authoritative,false);
assert.throws(()=>service.saveIngredient({}),/shadow read-only/);
assert.throws(()=>service.saveInventory({}),/shadow read-only/);
console.log('Fresh Core V3 Ingredients + Inventory foundation: PASS');
