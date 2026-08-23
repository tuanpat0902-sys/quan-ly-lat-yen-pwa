import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-read-takeover.js',import.meta.url),'utf8');
let legacyCalls=0;
const legacyFetch=async(table,orderColumn,ascending)=>{legacyCalls++;return [{table,orderColumn,ascending,legacy:true}];};
const snapshot={
  warehouses:[{id:'w2',created_at:'2026-02-01'},{id:'w1',created_at:'2026-01-01'}],
  suppliers:[{id:'s1',name:'B'},{id:'s2',name:'A'}],
  ingredients:[{id:'i1'}],preparedItems:[{id:'pi1'}],products:[{id:'p1'}],recipeItems:[{id:'r1'}],
  inventoryData:{balances:[{id:'inv1'}],transactions:[{id:'tx1'}]},
  importsData:{receipts:[{id:'ir1'}],items:[{id:'ii1'}]},exportsData:{receipts:[{id:'er1'}],items:[{id:'ei1'}]},
  stocktakeData:{receipts:[{id:'sr1'}],items:[{id:'si1'}]},salesData:{sales:[{id:'sale1'}],items:[{id:'salei1'}]},
  cashflowEntries:[{id:'c1'}]
};
let shadow={phase:'ready',orgId:'org-1'};
const context={console,Date,setTimeout(fn){fn();return 1;},window:{__lyFreshOrgId:'org-1',lyFreshFetch:legacyFetch,__lyFreshCoreV2:{store:{getState(){return snapshot;}}},__lyFreshCoreV2Shadow:{status(){return shadow;}}}};
context.lyFreshFetch=legacyFetch;context.globalThis=context;
vm.createContext(context);vm.runInContext(source,context,{filename:'ly-fresh-core-v2-read-takeover.js'});
const api=context.window.__lyFreshCoreV2ReadTakeover;assert.equal(api.status().enabled,true);
const tables={
  ly_warehouses:'w1',ly_suppliers:'s2',ly_ingredients:'i1',ly_prepared_items:'pi1',ly_products:'p1',ly_recipe_items:'r1',ly_inventory:'inv1',
  ly_import_receipts:'ir1',ly_import_items:'ii1',ly_export_receipts:'er1',ly_export_items:'ei1',ly_stocktake_receipts:'sr1',ly_stocktake_items:'si1',
  ly_sales:'sale1',ly_sale_items:'salei1',ly_stock_transactions:'tx1',ly_cashflow_entries:'c1'
};
for(const [table,id] of Object.entries(tables)){
  const order=table==='ly_warehouses'?'created_at':table==='ly_suppliers'?'name':null;
  const rows=await context.lyFreshFetch(table,order,true);
  assert.equal(rows[0].id,id,`${table} must read from V2 state with Legacy-compatible ordering`);
}
assert.equal(legacyCalls,0,'all 17 Fresh tables must avoid Supabase when V2 shadow is ready');
const unknown=await context.lyFreshFetch('ly_unknown');assert.equal(unknown[0].legacy,true);assert.equal(legacyCalls,1,'unknown tables must fall back');
shadow={phase:'loading',orgId:'org-1'};const loading=await context.lyFreshFetch('ly_products');assert.equal(loading[0].legacy,true);assert.equal(legacyCalls,2,'not-ready shadow must fall back');
shadow={phase:'ready',orgId:'other-org'};const wrongOrg=await context.lyFreshFetch('ly_products');assert.equal(wrongOrg[0].legacy,true);assert.equal(legacyCalls,3,'org mismatch must fall back');
shadow={phase:'ready',orgId:'org-1'};api.disable();const disabled=await context.lyFreshFetch('ly_products');assert.equal(disabled[0].legacy,true);assert.equal(legacyCalls,4,'disable must restore Legacy fetch');
console.log('Fresh Core V2 read takeover: PASS');
