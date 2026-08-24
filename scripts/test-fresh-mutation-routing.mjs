import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const index=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const migration=await fs.readFile(
  new URL('../supabase/migrations/20260824163000_scope_ingredient_to_selected_warehouse.sql',import.meta.url),
  'utf8'
);

const helperStart=index.indexOf('async function lyFreshRunRpc');
const helperEnd=index.indexOf('saveIngredient=async function',helperStart);
assert.ok(helperStart>0&&helperEnd>helperStart,'Fresh mutation helper must exist before business save handlers');

let rawCalls=0;
const refreshes=[];
const snapshot={ingredients:[{id:'ingredient-1'}],inventoryData:{balances:[]}};
const context={
  console,
  sb:{rpc(){throw new Error('legacy wrapped rpc must not be used');}},
  invalidateDataIndexes(){},
  invalidateDerivedCaches(){},
  window:{
    __lyFreshCoreV2:{
      data:{async rpc(name,params){rawCalls++;return `${name}:${params.value}`;}},
      domains:{
        imports:{async refresh(){refreshes.push('imports');}},
        inventory:{async refresh(){refreshes.push('inventory');}}
      },
      store:{getState(){return snapshot;}}
    },
    __lyFreshCoreV2LegacyHydration:{hydrate(value){assert.equal(value,snapshot);return true;}}
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(index.slice(helperStart,helperEnd),context,{filename:'fresh-mutation-helper.js'});

const result=await context.lyFreshRunRpc('ly_save_import',{value:'ok'},['imports','inventory','imports']);
assert.equal(result.data,'ly_save_import:ok');
assert.equal(result.error,null);
assert.equal(result._lyFreshDirect,true);
assert.equal(rawCalls,1,'a mutation must hit the captured V2 RPC exactly once');
assert.deepEqual(refreshes,['imports','inventory'],'domain refreshes must be targeted and de-duplicated');
assert.equal(context.lyFreshProjectCoreState(),true);

for(const rpc of ['ly_save_ingredient','ly_save_product','ly_save_import','ly_save_export','ly_save_stocktake','ly_save_sale']){
  assert.match(index,new RegExp(`lyFreshRunRpc\\(\\s*['"]${rpc}['"]`),`${rpc} must bypass legacy wrapper recursion`);
}

assert.match(index,/id:id\|\|null,warehouse_id:currentWarehouseId,code:null/,'ingredient payload must carry the selected warehouse');
assert.match(migration,/v_warehouse_id uuid/,'Cloud RPC must resolve one selected warehouse');
assert.match(migration,/on conflict \(org_id, warehouse_id, ingredient_id\) do nothing/,'warehouse membership must remain idempotent');
assert.doesNotMatch(migration,/select\s+v_org\s*,\s*w\.id\s*,\s*v_id\s*,\s*0/is,'Cloud RPC must not create inventory membership in every warehouse');

console.log('Fresh mutation routing and warehouse scope: PASS');
