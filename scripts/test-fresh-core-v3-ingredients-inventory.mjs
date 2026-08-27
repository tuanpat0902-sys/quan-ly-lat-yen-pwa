import assert from 'node:assert/strict';
import {
  INGREDIENTS_INVENTORY_CONTRACT,
  INGREDIENTS_INVENTORY_SCHEMA,
  createIngredientsInventoryRepository,
  createIngredientsInventoryService
} from '../src-v3/domains/ingredients-inventory/index.js';

assert.equal(INGREDIENTS_INVENTORY_CONTRACT.tables.ingredients,'ly_ingredients');
assert.equal(INGREDIENTS_INVENTORY_CONTRACT.tables.inventory,'ly_inventory');
assert.deepEqual(INGREDIENTS_INVENTORY_SCHEMA.inventory.primaryKey,['warehouse_id','ingredient_id']);

const ingredient={id:'i1',org_id:'o1',code:'CF',name:'Coffee',unit:'g',ingredient_type:'purchased',batch_output_qty:1,cost:10,minimum_stock:2,active:true,created_at:'2026-01-01',updated_at:'2026-01-02',purchase_unit:'kg',conversion_ratio:1000};
const balance={org_id:'o1',warehouse_id:'w1',ingredient_id:'i1',quantity:2,updated_at:'2026-01-02'};
const cloud={ly_ingredients:[ingredient],ly_inventory:[balance]};
const gateway={async selectPage(table){return {rows:cloud[table]||[],count:(cloud[table]||[]).length}}};
const repository=createIngredientsInventoryRepository({gateway});
const cacheMap=new Map();
const cache={set:(k,v)=>cacheMap.set(k,{value:v}),get:k=>cacheMap.get(k)};
const events={emit(){}};
const v2State={ingredients:[ingredient],inventoryData:{balances:[balance],transactions:[]}};
const service=createIngredientsInventoryService({repository,cache,events,v2Adapter:{getState:()=>v2State}});
const result=await service.refreshShadow();

assert.equal(result.parityReady,true);
assert.equal(result.parity.ingredients.v2Count,1);
assert.equal(result.parity.inventory.v3Count,1);
assert.equal(service.authoritative,false);
assert.throws(()=>service.saveIngredient({}),/shadow read-only/);
assert.throws(()=>service.saveInventory({}),/shadow read-only/);
console.log('Fresh Core V3 Ingredients + Inventory schema/parity: PASS');
