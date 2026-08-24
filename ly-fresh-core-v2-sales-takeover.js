(()=>{
  'use strict';
  if(window.__lyFreshCoreV2SalesTakeoverV1)return;
  window.__lyFreshCoreV2SalesTakeoverV1=true;

  const VERSION='2026.08.24.3';
  const MAX_WAIT_MS=60000;
  const STARTED_AT=Date.now();
  const state={version:VERSION,phase:'waiting',enabled:false,calls:0,success:0,errors:0,fallbacks:0,hydrations:0,suppressedReloads:0,lastRpc:'',lastAt:0,lastError:''};
  let client=null,previousRpc=null,originalLoadCloud=null,suppressNextLoadCloud=false;

  function legacySupabase(){try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}return window.sb||null;}
  function coreReady(){const core=window.__lyFreshCoreV2;return core?.domains?.sales?.save&&core?.domains?.sales?.remove&&core?.domains?.inventory?.refresh&&core?.store?.getState?core:null;}

  function hydrateLegacy(){
    const core=coreReady();if(!core)return false;
    const s=core.store.getState()||{};
    const sales=s.salesData||{sales:[],items:[]};const inventory=s.inventoryData||{balances:[],transactions:[]};
    try{
      window.__lyFreshHeaders={...(window.__lyFreshHeaders||{}),sales:(sales.sales||[]).slice(),saleItems:(sales.items||[]).slice(),transactions:(inventory.transactions||[]).slice()};
      if(typeof db!=='undefined'&&db){db.sales=(sales.sales||[]).slice();db.saleItems=(sales.items||[]).slice();db.inventory=(inventory.balances||[]).slice();db.movements=(inventory.transactions||[]).slice();}
      if(typeof invalidateDataIndexes==='function')invalidateDataIndexes();else if(typeof invalidateDerivedCaches==='function')invalidateDerivedCaches();
      for(const name of ['renderSales','renderDashboard','renderReports','renderFinanceData'])try{if(typeof globalThis[name]==='function')globalThis[name]();}catch(e){}
      state.hydrations++;return true;
    }catch(error){state.lastError=String(error?.message||error||'Legacy sales hydration failed');return false;}
  }

  function installLoadCloudGuard(){
    if(originalLoadCloud)return true;
    try{if(typeof loadCloud!=='function')return false;originalLoadCloud=loadCloud;loadCloud=async function(...args){if(suppressNextLoadCloud){suppressNextLoadCloud=false;state.suppressedReloads++;hydrateLegacy();return {v2:true,suppressed:true};}return originalLoadCloud.apply(this,args);};return true;}catch(e){return false;}
  }

  async function routedRpc(name,params,...rest){
    const isSave=name==='ly_save_sale';const isDelete=name==='ly_delete_receipt'&&String(params?.p_type||'').toLowerCase()==='sale';
    if(!isSave&&!isDelete)return previousRpc(name,params,...rest);
    state.calls++;state.lastRpc=name;state.lastAt=Date.now();const core=coreReady();if(!core){state.fallbacks++;return previousRpc(name,params,...rest);}
    try{
      const data=isSave?await core.domains.sales.save(params?.p_header,Array.isArray(params?.p_sale_items)?params.p_sale_items:[],Array.isArray(params?.p_stock_lines)?params.p_stock_lines:[]):await core.domains.sales.remove(params?.p_id);
      await core.domains.inventory.refresh();
      hydrateLegacy();suppressNextLoadCloud=true;state.success++;state.lastError='';
      window.dispatchEvent(new CustomEvent('latyen:v2-sale-mutated',{detail:{rpc:name,id:data||params?.p_id||'',at:state.lastAt}}));
      return {data,error:null,status:200,statusText:'OK'};
    }catch(error){suppressNextLoadCloud=false;state.errors++;state.lastError=String(error?.message||error||'V2 sale mutation failed');return {data:null,error,status:400,statusText:'V2 sale mutation failed'};}
  }

  function enable(){if(state.enabled)return true;client=legacySupabase();if(!client||typeof client.rpc!=='function'||!coreReady()||!installLoadCloudGuard())return false;if(client.rpc?.__lyV2SalesTakeover)return true;previousRpc=client.rpc.bind(client);const wrapper=routedRpc;Object.defineProperty(wrapper,'__lyV2SalesTakeover',{value:true});client.rpc=wrapper;state.enabled=true;state.phase='active';state.lastError='';return true;}
  function disable(){if(client&&previousRpc&&client.rpc?.__lyV2SalesTakeover)client.rpc=previousRpc;try{if(originalLoadCloud&&typeof loadCloud==='function')loadCloud=originalLoadCloud;}catch(e){}suppressNextLoadCloud=false;state.enabled=false;state.phase='disabled';}
  function boot(){if(enable())return;if(Date.now()-STARTED_AT>=MAX_WAIT_MS){state.phase='idle-no-context';return;}setTimeout(boot,500);}
  window.__lyFreshCoreV2SalesTakeover={version:VERSION,enable,disable,status:()=>({...state})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
