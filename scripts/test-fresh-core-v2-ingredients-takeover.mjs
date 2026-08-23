import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-ingredients-takeover.js',import.meta.url),'utf8');
const originalCalls=[];
const saveCalls=[];
const client={
  async rpc(name,params){originalCalls.push([name,params]);return {data:'legacy-id',error:null};}
};
const listeners=new Map();
const context={
  console,
  setTimeout(fn){fn();return 1;},
  clearTimeout(){},
  CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}},
  document:{readyState:'complete',addEventListener(){}},
  window:{
    sb:client,
    __lyFreshCoreV2:{domains:{ingredients:{async save(ingredient,preparedItems){saveCalls.push([ingredient,preparedItems]);return 'v2-id';}}}},
    addEventListener(type,fn){listeners.set(type,fn);},
    dispatchEvent(){}
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-fresh-core-v2-ingredients-takeover.js'});

assert.equal(context.window.__lyFreshCoreV2IngredientsTakeover.status().enabled,true);
const ingredient={name:'A'};
const prepared=[{source_ingredient_id:'i1',quantity:2}];
const result=await client.rpc('ly_save_ingredient',{p_ingredient:ingredient,p_prepared_items:prepared});
assert.equal(result.data,'v2-id');
assert.equal(result.error,null);
assert.deepEqual(saveCalls,[[ingredient,prepared]]);
assert.equal(originalCalls.length,0,'ingredient save must not double-write through legacy RPC');

const other=await client.rpc('ly_save_product',{p_product:{name:'P'}});
assert.equal(other.data,'legacy-id');
assert.equal(originalCalls.length,1);
assert.equal(originalCalls[0][0],'ly_save_product');

context.window.__lyFreshCoreV2IngredientsTakeover.disable();
assert.equal(context.window.__lyFreshCoreV2IngredientsTakeover.status().enabled,false);
await client.rpc('ly_save_ingredient',{p_ingredient:{name:'B'},p_prepared_items:[]});
assert.equal(originalCalls.length,2,'disable must restore legacy RPC exactly once');

console.log('Fresh Core V2 ingredients takeover: PASS');
