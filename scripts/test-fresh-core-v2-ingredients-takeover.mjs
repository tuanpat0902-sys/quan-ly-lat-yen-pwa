import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-ingredients-takeover.js',import.meta.url),'utf8');
const originalCalls=[];
const saveCalls=[];
let loadCloudCalls=0;
let renderCalls=0;
let invalidateCalls=0;
let ingredients=[{id:'old',name:'Old'}];
let preparedItems=[];
const client={
  async rpc(name,params){originalCalls.push([name,params]);return {data:'legacy-id',error:null};}
};
const listeners=new Map();
const context={
  console,
  db:{ingredients:[],preparedItems:[]},
  loadCloud:async()=>{loadCloudCalls++;return {legacy:true};},
  renderIngredients(){renderCalls++;},
  invalidateDerivedCaches(){invalidateCalls++;},
  setTimeout(fn){fn();return 1;},
  clearTimeout(){},
  CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}},
  document:{readyState:'complete',addEventListener(){}},
  window:{
    sb:client,
    __lyFreshCoreV2:{
      store:{getState(){return {ingredients,preparedItems};}},
      domains:{ingredients:{async save(ingredient,nextPrepared){
        saveCalls.push([ingredient,nextPrepared]);
        ingredients=[{...ingredient,id:'v2-id'}];
        preparedItems=nextPrepared.map((x,index)=>({...x,id:`prep-${index+1}`,prepared_ingredient_id:'v2-id'}));
        return 'v2-id';
      }}}
    },
    addEventListener(type,fn){listeners.set(type,fn);},
    dispatchEvent(){}
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-fresh-core-v2-ingredients-takeover.js'});

const api=context.window.__lyFreshCoreV2IngredientsTakeover;
assert.equal(api.status().enabled,true);
const ingredient={name:'A',ingredient_type:'prepared'};
const prepared=[{source_ingredient_id:'i1',quantity:2}];
const result=await client.rpc('ly_save_ingredient',{p_ingredient:ingredient,p_prepared_items:prepared});
assert.equal(result.data,'v2-id');
assert.equal(result.error,null);
assert.deepEqual(saveCalls,[[ingredient,prepared]]);
assert.equal(originalCalls.length,0,'ingredient save must not double-write through legacy RPC');
assert.deepEqual(context.db.ingredients,[{...ingredient,id:'v2-id'}]);
assert.equal(context.db.preparedItems.length,1,'prepared items must hydrate into Legacy db');
assert.equal(context.db.preparedItems[0].source_ingredient_id,'i1');
assert.ok(renderCalls>=1,'ingredient UI must render from hydrated V2 state');
assert.ok(invalidateCalls>=1,'derived caches must be invalidated after V2 hydration');

const suppressed=await context.loadCloud();
assert.equal(suppressed.suppressed,true,'immediate post-save loadCloud must be suppressed once');
assert.equal(loadCloudCalls,0);
assert.equal(api.status().suppressedReloads,1);
await context.loadCloud();
assert.equal(loadCloudCalls,1,'later/manual loadCloud must remain available');

const other=await client.rpc('ly_save_product',{p_product:{name:'P'}});
assert.equal(other.data,'legacy-id');
assert.equal(originalCalls.length,1);
assert.equal(originalCalls[0][0],'ly_save_product');
await context.loadCloud();
assert.equal(loadCloudCalls,2,'non-ingredient RPC must not arm suppression');

api.disable();
assert.equal(api.status().enabled,false);
await client.rpc('ly_save_ingredient',{p_ingredient:{name:'B'},p_prepared_items:[]});
assert.equal(originalCalls.length,2,'disable must restore legacy RPC exactly once');
await context.loadCloud();
assert.equal(loadCloudCalls,3,'disable must restore original loadCloud');

console.log('Fresh Core V2 ingredients takeover: PASS');
