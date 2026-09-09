import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const index=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const businessApi=await fs.readFile(new URL('./vibehost-business-mutation-api.mjs',import.meta.url),'utf8');
const staticServer=await fs.readFile(new URL('./vibehost-static-server.mjs',import.meta.url),'utf8');
const vibeWrites=await fs.readFile(new URL('../ly-vibe-business-writes.js',import.meta.url),'utf8');
const employees=await fs.readFile(new URL('../ly-employees.js',import.meta.url),'utf8');
const finance=await fs.readFile(new URL('../ly-finance.js',import.meta.url),'utf8');
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
assert.match(vibeWrites,/usesVibe[\s\S]*\/api\/v1\/business\/ingredient/,'ingredient edits on Vibe Host must bypass restricted Supabase services');
assert.match(vibeWrites,/usesVibe[\s\S]*\/api\/v1\/business\/product/,'recipe edits on Vibe Host must bypass restricted Supabase services');
for(const route of ['import','export','stocktake','sale','warehouse','supplier','cashflow'])assert.ok(vibeWrites.includes(`/api/v1/business/${route}`),`${route} saves on Vibe Host must persist through the direct business API`);
assert.match(vibeWrites,/syncEmployees[\s\S]*\/api\/v1\/business\/employees/,'employees must be de-duplicated and synchronized with Vibe Host');
assert.match(vibeWrites,/installing\|\|window\.__lyVibeBusinessWrites\?\.version===VERSION/,'business save bridge must prevent duplicate initialization');
assert.match(businessApi,/authenticatedVibeUser[\s\S]*client\.query\('begin'\)[\s\S]*client\.query\('commit'\)/,'Vibe business writes must be authenticated and transactional');
assert.match(businessApi,/let client[\s\S]*client=await acquireClient\(\)[\s\S]*client\?\.release\(\)/,'connection failures must not crash the Vibe process');
assert.match(businessApi,/employeeMatch[\s\S]*request\.method==='DELETE'/,'employee deletes must be persisted on Vibe Host');
assert.match(businessApi,/rebuildVibeIposInventory/,'recipe edits must reconcile historical iPOS inventory');
const productHandler=businessApi.slice(businessApi.indexOf('async function saveProduct'),businessApi.indexOf('async function reconcileProductInventory'));
assert.ok(productHandler.indexOf("throw new Error('Invalid recipe items')")<productHandler.indexOf('delete from ${qi(schema)}.ly_recipe_items'),'invalid or empty recipes must be rejected before existing ingredients are deleted');
assert.match(productHandler,/Recipe persistence verification failed/,'recipe children must be verified inside the same transaction');
assert.match(vibeWrites,/business\/product[\s\S]*await refreshFromVibe\(\)[\s\S]*Dữ liệu công thức tải lại chưa đầy đủ/,'recipe save must reload and verify authoritative Cloud children before reporting success');
for(const handler of ['saveDocument','saveSale','saveWarehouse','saveSupplier','saveCashflow'])assert.match(businessApi,new RegExp(`function ${handler}\\(`),`${handler} must be implemented by the Vibe PostgreSQL service`);
assert.match(businessApi,/json\(response,200,result\);if\(reconcile\)queueMicrotask/,'recipe save response must not wait for the historical inventory rebuild');
assert.match(staticServer,/handleBusinessMutationApi/,'the production server must expose Vibe business mutations');
assert.match(employees,/danger sm" onclick="deleteEmployee\('\$\{e\.id\}'\)"/,'employee rows must expose an explicit delete action');
assert.match(finance,/tổng giá trị thiếu hụt ước tính[\s\S]*không phải tồn kho ròng/,'negative-stock estimate must explain that it is not the net inventory value');
assert.match(migration,/v_warehouse_id uuid/,'Cloud RPC must resolve one selected warehouse');
assert.match(migration,/on conflict \(org_id, warehouse_id, ingredient_id\) do nothing/,'warehouse membership must remain idempotent');
assert.doesNotMatch(migration,/select\s+v_org\s*,\s*w\.id\s*,\s*v_id\s*,\s*0/is,'Cloud RPC must not create inventory membership in every warehouse');

console.log('Fresh mutation routing and warehouse scope: PASS');
