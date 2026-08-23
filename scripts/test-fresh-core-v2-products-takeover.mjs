import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-products-takeover.js',import.meta.url),'utf8');
const previousCalls=[];
const productSaveCalls=[];

const client={
  async rpc(name,params){previousCalls.push([name,params]);return {data:`previous:${name}`,error:null};}
};

// Simulate the already-installed Ingredients takeover wrapper. Products takeover
// must compose on top of this function instead of replacing/bypassing it.
const priorRpc=client.rpc.bind(client);
client.rpc=async function(name,params){
  if(name==='ly_save_ingredient'){
    previousCalls.push(['ingredients-wrapper',params]);
    return {data:'ingredient-v2-id',error:null};
  }
  return priorRpc(name,params);
};

const context={
  console,
  setTimeout(fn){fn();return 1;},
  clearTimeout(){},
  CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}},
  document:{readyState:'complete',addEventListener(){}},
  window:{
    sb:client,
    __lyFreshCoreV2:{domains:{products:{async save(product,recipeItems){productSaveCalls.push([product,recipeItems]);return 'product-v2-id';}}}},
    dispatchEvent(){}
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-fresh-core-v2-products-takeover.js'});

assert.equal(context.window.__lyFreshCoreV2ProductsTakeover.status().enabled,true);
const product={name:'P'};
const recipe=[{ingredient_id:'i1',quantity:2}];
const result=await client.rpc('ly_save_product',{p_product:product,p_recipe_items:recipe});
assert.equal(result.data,'product-v2-id');
assert.equal(result.error,null);
assert.deepEqual(productSaveCalls,[[product,recipe]]);
assert.equal(previousCalls.length,0,'product save must not double-write through previous RPC chain');

const ingredient=await client.rpc('ly_save_ingredient',{p_ingredient:{name:'A'},p_prepared_items:[]});
assert.equal(ingredient.data,'ingredient-v2-id');
assert.equal(previousCalls.length,1);
assert.equal(previousCalls[0][0],'ingredients-wrapper','Products adapter must preserve Ingredients takeover chain');

const other=await client.rpc('ly_save_sale',{p_header:{code:'S1'}});
assert.equal(other.data,'previous:ly_save_sale');
assert.equal(previousCalls.length,2);
assert.equal(previousCalls[1][0],'ly_save_sale');

context.window.__lyFreshCoreV2ProductsTakeover.disable();
assert.equal(context.window.__lyFreshCoreV2ProductsTakeover.status().enabled,false);
await client.rpc('ly_save_product',{p_product:{name:'Legacy'},p_recipe_items:[]});
assert.equal(previousCalls.length,3,'disable must restore previous RPC chain exactly once');
assert.equal(previousCalls[2][0],'ly_save_product');

console.log('Fresh Core V2 products takeover: PASS');
