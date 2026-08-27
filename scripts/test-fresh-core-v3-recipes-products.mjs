import assert from 'node:assert/strict';
import {
  RECIPES_PRODUCTS_CONTRACT,
  RECIPES_PRODUCTS_SCHEMA,
  createRecipesProductsRepository,
  createRecipesProductsService
} from '../src-v3/domains/recipes-products/index.js';

assert.equal(RECIPES_PRODUCTS_CONTRACT.tables.products,'ly_products');
assert.equal(RECIPES_PRODUCTS_CONTRACT.tables.recipeItems,'ly_recipe_items');
assert.equal(RECIPES_PRODUCTS_CONTRACT.authoritative,false);
assert.equal(RECIPES_PRODUCTS_CONTRACT.writes,false);
assert.equal(RECIPES_PRODUCTS_SCHEMA.products.primaryKey,'id');
assert.equal(RECIPES_PRODUCTS_SCHEMA.recipeItems.primaryKey,'id');

const product={
  id:'p1',org_id:'o1',warehouse_id:'w1',name:'Yogurt',sku:'YG',unit:'cup',selling_price:39000,
  active:true,created_at:'2026-01-01',updated_at:'2026-01-02',ipos_item_id:'ipos-p1',
  ipos_item_type_id:'t1',ipos_item_type_name:'Drink',ipos_item_class_id:'c1',ipos_item_class_name:'Cold',
  ipos_last_synced_at:'2026-01-03'
};
const recipeItem={id:'r1',org_id:'o1',product_id:'p1',ingredient_id:'i1',quantity:2,created_at:'2026-01-01',updated_at:'2026-01-02'};
const cloud={ly_products:[product],ly_recipe_items:[recipeItem]};
const gateway={
  async selectPage(table){
    const rows=cloud[table]||[];
    return {rows,count:rows.length};
  }
};
const repository=createRecipesProductsRepository({gateway});
const cacheMap=new Map();
const cache={set:(k,v)=>cacheMap.set(k,{value:v}),get:k=>cacheMap.get(k)};
const emitted=[];
const events={emit:(type,payload)=>emitted.push([type,payload])};
const v2Product={...product,created_at:'old',updated_at:'old',ipos_last_synced_at:'old'};
const v2RecipeItem={...recipeItem,created_at:'old',updated_at:'old'};
const service=createRecipesProductsService({
  repository,cache,events,
  v2Adapter:{getState:()=>({products:[v2Product],recipeItems:[v2RecipeItem]})}
});

const shadow=await service.refreshShadow();
assert.equal(shadow.parityReady,true);
assert.equal(shadow.parity.products.v2Count,1);
assert.equal(shadow.parity.recipeItems.v3Count,1);
assert.equal(shadow.authoritative,false);
assert.equal(service.authoritative,false);
assert.equal(emitted.some(([type])=>type==='recipes-products:parity-mismatch'),false);

const controlled=await service.refreshControlledShadow();
assert.equal(controlled.complete,true);
assert.equal(controlled.parityReady,true);
assert.deepEqual(controlled.counts,{products:1,recipeItems:1});
assert.equal(controlled.authoritative,false);

assert.throws(()=>service.saveProduct({}),/shadow read-only/);
assert.throws(()=>service.saveRecipeItem({}),/shadow read-only/);
assert.throws(()=>service.removeProduct('p1'),/shadow read-only/);
assert.throws(()=>service.removeRecipeItem('r1'),/shadow read-only/);

console.log('Fresh Core V3 Recipes / Products schema/parity: PASS');
