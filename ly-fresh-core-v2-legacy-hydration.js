(()=>{
'use strict';
if(window.__lyFreshCoreV2LegacyHydration)return;
const VERSION='2026.08.23.1';
const state={version:VERSION,hydrates:0,errors:0,lastAt:0,lastError:''};
const cloneRows=rows=>Array.isArray(rows)?rows.map(row=>row&&typeof row==='object'?{...row}:row):[];
function legacyDb(){try{if(typeof db!=='undefined'&&db)return db;}catch(e){}return window.db||null;}
function snapshot(){const core=window.__lyFreshCoreV2;return core?.store?.getState?core.store.getState():null;}
function hydrate(input){
 const s=input||snapshot();const target=legacyDb();
 if(!s||!target)return false;
 try{
  target.warehouses=cloneRows(s.warehouses);target.suppliers=cloneRows(s.suppliers);
  target.ingredients=cloneRows(s.ingredients);target.preparedItems=cloneRows(s.preparedItems);
  target.products=cloneRows(s.products);target.recipeItems=cloneRows(s.recipeItems);
  target.inventory=cloneRows(s.inventoryData?.balances);target.movements=cloneRows(s.inventoryData?.transactions);
  target.sales=cloneRows(s.salesData?.sales);target.saleItems=cloneRows(s.salesData?.items);
  const imports=s.importsData||{},exports=s.exportsData||{},stocktake=s.stocktakeData||{},sales=s.salesData||{},inventory=s.inventoryData||{};
  window.__lyFreshHeaders={...(window.__lyFreshHeaders||{}),imports:cloneRows(imports.receipts),importItems:cloneRows(imports.items),exports:cloneRows(exports.receipts),exportItems:cloneRows(exports.items),stocktakes:cloneRows(stocktake.receipts),stocktakeItems:cloneRows(stocktake.items),sales:cloneRows(sales.sales),saleItems:cloneRows(sales.items),transactions:cloneRows(inventory.transactions)};
  window.__lyFreshCashflow=cloneRows(s.cashflowEntries).map(x=>({...x,type:x.entry_type??x.type,date:x.entry_date??x.date,amount:Number(x.amount||0)}));
  state.hydrates++;state.lastAt=Date.now();state.lastError='';return true;
 }catch(error){state.errors++;state.lastError=String(error?.message||error||'Legacy hydration failed');return false;}
}
window.__lyFreshCoreV2LegacyHydration={version:VERSION,hydrate,status:()=>({...state})};
})();
