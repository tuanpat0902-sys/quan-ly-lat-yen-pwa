(()=>{
'use strict';
if(window.__lyFreshCoreV2MasterDataTakeover)return;
const VERSION='2026.08.23.4';
const SUPPRESS_MS=2000;
const state={version:VERSION,enabled:false,calls:0,errors:0,suppressedFullReloads:0,legacySyncs:0,legacyRenders:0,lastOptimizedTable:'',lastError:''};
let client,previousFrom,originalLoadCloud=null,suppressUntil=0;
const getClient=()=>{try{return sb}catch(e){return window.sb}};
const getCore=()=>window.__lyFreshCoreV2?.domains?.masterData?window.__lyFreshCoreV2:null;
const getLegacyDb=()=>{try{if(typeof db!=='undefined'&&db)return db}catch(e){}return window.db||null};
const result=(data,error=null)=>({data:error?null:data,error,status:error?400:200,statusText:error?'V2 master-data mutation failed':'OK'});
function syncLegacySlices(){
 const core=getCore(),legacy=getLegacyDb(),snapshot=core?.store?.getState?.();
 if(!legacy||!snapshot)return false;
 if(Array.isArray(snapshot.warehouses))legacy.warehouses=snapshot.warehouses;
 if(Array.isArray(snapshot.suppliers))legacy.suppliers=snapshot.suppliers;
 const inventory=snapshot.inventoryData?.balances;
 if(Array.isArray(inventory))legacy.inventory=inventory;
 state.legacySyncs++;
 return true;
}
function refreshLegacyViews(){
 try{
  if(typeof globalThis.invalidateDerivedCaches==='function')globalThis.invalidateDerivedCaches();
  if(typeof globalThis.renderIngredients==='function')globalThis.renderIngredients();
  else if(typeof globalThis.renderAll==='function')globalThis.renderAll();
  if(typeof globalThis.updatePendingSyncBadge==='function')globalThis.updatePendingSyncBadge();
  state.legacyRenders++;return true;
 }catch(error){state.lastError=String(error?.message||error||'Legacy master-data render failed');return false;}
}
function armFullReloadSuppression(table){suppressUntil=Date.now()+SUPPRESS_MS;state.lastOptimizedTable=table;}
function installLoadCloudGuard(){
 if(originalLoadCloud)return true;
 let fn=null;
 try{if(typeof loadCloud==='function')fn=loadCloud}catch(e){}
 if(!fn&&typeof window.loadCloud==='function')fn=window.loadCloud;
 if(typeof fn!=='function')return false;
 originalLoadCloud=fn;
 const optimized=async function(...args){
  if(suppressUntil&&Date.now()<=suppressUntil){
   suppressUntil=0;state.suppressedFullReloads++;syncLegacySlices();refreshLegacyViews();
   return {optimized:true,source:'v2-master-data'};
  }
  suppressUntil=0;
  return originalLoadCloud.apply(this,args);
 };
 Object.defineProperty(optimized,'__lyV2MasterDataLoadCloud',{value:true});
 try{window.loadCloud=optimized}catch(e){}
 try{loadCloud=optimized}catch(e){}
 return true;
}
async function run(table,payload,operation='upsert'){
 state.calls++;
 try{
  const core=getCore();if(!core)throw new Error('Fresh Core V2 master data is not ready');
  let data;
  if(table==='ly_warehouses'&&operation==='delete')data=await core.domains.masterData.removeWarehouse(payload?.id);
  else if(table==='ly_warehouses')data=await core.domains.masterData.saveWarehouse(Array.isArray(payload)?payload[0]:payload);
  else if(table==='ly_suppliers')data=await core.domains.masterData.saveSupplier(Array.isArray(payload)?payload[0]:payload);
  else if(table==='ly_inventory'){
   await core.domains.masterData.initializeInventory(payload);
   await core.domains.inventory?.refresh?.();
   data=Array.isArray(payload)?payload:[payload];
  }
  syncLegacySlices();
  if((operation==='upsert'&&(table==='ly_warehouses'||table==='ly_suppliers'))||(operation==='delete'&&table==='ly_warehouses'))armFullReloadSuppression(table);
  state.lastError='';
  return result(data);
 }catch(error){state.errors++;state.lastError=String(error?.message||error);return result(null,error);}
}
function insert(table,payload){
 let promise;
 const exec=()=>promise||(promise=run(table,payload,'insert'));
 const b={select(){return b},async single(){const r=await exec();return r.error?r:{...r,data:Array.isArray(r.data)?r.data[0]??null:r.data}},then(a,z){return exec().then(a,z)},catch(z){return exec().catch(z)},finally(f){return exec().finally(f)}};
 return b;
}
function removeWarehouse(){
 let id='',promise;
 const exec=()=>promise||(promise=id?run('ly_warehouses',{id},'delete'):Promise.resolve(result(null,new Error('warehouse id is required'))));
 const b={
  eq(column,value){if(column==='id')id=value;return b;},
  select(){return b;},
  then(a,z){return exec().then(a,z)},
  catch(z){return exec().catch(z)},
  finally(f){return exec().finally(f)}
 };
 return b;
}
function wrap(raw,table){return new Proxy(raw,{get(target,key){
 if(key==='upsert')return payload=>run(table,payload,'upsert');
 if(key==='insert')return payload=>insert(table,payload);
 if(key==='delete'&&table==='ly_warehouses')return ()=>removeWarehouse();
 const value=target[key];return typeof value==='function'?value.bind(target):value;
}})}
function enable(){
 if(state.enabled)return true;
 client=getClient();const core=getCore();if(!client||!core||typeof client.from!=='function'||typeof core.domains.masterData.removeWarehouse!=='function')return false;
 previousFrom=client.from.bind(client);
 client.from=function(name,...args){const raw=previousFrom(name,...args);return ['ly_warehouses','ly_suppliers','ly_inventory'].includes(String(name))?wrap(raw,String(name)):raw};
 installLoadCloudGuard();
 state.enabled=true;return true;
}
function boot(){if(enable()){if(!originalLoadCloud)setTimeout(installLoadCloudGuard,0);return}setTimeout(boot,500)}
window.__lyFreshCoreV2MasterDataTakeover={version:VERSION,enable,status:()=>({...state})};
setTimeout(boot,0);
})();
