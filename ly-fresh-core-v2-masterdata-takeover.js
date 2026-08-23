(()=>{
'use strict';
if(window.__lyFreshCoreV2MasterDataTakeover)return;
const state={enabled:false,calls:0,errors:0};
let client,previousFrom;
const getClient=()=>{try{return sb}catch(e){return window.sb}};
const getCore=()=>window.__lyFreshCoreV2?.domains?.masterData?window.__lyFreshCoreV2:null;
const result=(data,error=null)=>({data:error?null:data,error,status:error?400:200,statusText:error?'V2 master-data mutation failed':'OK'});
async function run(table,payload){
 state.calls++;
 try{
  const core=getCore();if(!core)throw new Error('Fresh Core V2 master data is not ready');
  if(table==='ly_warehouses')return result(await core.domains.masterData.saveWarehouse(Array.isArray(payload)?payload[0]:payload));
  if(table==='ly_suppliers')return result(await core.domains.masterData.saveSupplier(Array.isArray(payload)?payload[0]:payload));
  if(table==='ly_inventory'){await core.domains.masterData.initializeInventory(payload);return result(Array.isArray(payload)?payload:[payload]);}
 }catch(error){state.errors++;return result(null,error);}
}
function insert(table,payload){
 let promise;
 const exec=()=>promise||(promise=run(table,payload));
 const b={select(){return b},async single(){const r=await exec();return r.error?r:{...r,data:Array.isArray(r.data)?r.data[0]??null:r.data}},then(a,z){return exec().then(a,z)},catch(z){return exec().catch(z)},finally(f){return exec().finally(f)}};
 return b;
}
function wrap(raw,table){return new Proxy(raw,{get(target,key){if(key==='upsert')return payload=>run(table,payload);if(key==='insert')return payload=>insert(table,payload);const value=target[key];return typeof value==='function'?value.bind(target):value;}})}
function enable(){
 if(state.enabled)return true;
 client=getClient();const core=getCore();if(!client||!core||typeof client.from!=='function')return false;
 previousFrom=client.from.bind(client);
 client.from=function(name,...args){const raw=previousFrom(name,...args);return ['ly_warehouses','ly_suppliers','ly_inventory'].includes(String(name))?wrap(raw,String(name)):raw};
 state.enabled=true;return true;
}
function boot(){if(enable())return;setTimeout(boot,500)}
window.__lyFreshCoreV2MasterDataTakeover={enable,status:()=>({...state})};
setTimeout(boot,0);
})();
