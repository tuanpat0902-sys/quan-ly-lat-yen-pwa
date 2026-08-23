(()=>{
  'use strict';
  if(window.__lyFreshCoreV2IngredientsTakeoverV1)return;
  window.__lyFreshCoreV2IngredientsTakeoverV1=true;

  const VERSION='2026.08.23.2';
  const TARGET_RPC='ly_save_ingredient';
  const MAX_WAIT_MS=60000;
  const STARTED_AT=Date.now();
  const state={version:VERSION,phase:'waiting',enabled:false,calls:0,success:0,errors:0,fallbacks:0,hydrations:0,suppressedReloads:0,lastAt:0,lastError:''};
  let client=null;
  let originalRpc=null;
  let originalLoadCloud=null;
  let suppressNextLoadCloud=false;

  function legacySupabase(){
    try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}
    return window.sb||null;
  }

  function coreReady(){
    const core=window.__lyFreshCoreV2;
    return core?.domains?.ingredients?.save&&core?.store?.getState?core:null;
  }

  function hydrateLegacy(){
    const core=coreReady();
    if(!core)return false;
    const snapshot=core.store.getState()||{};
    const ingredients=Array.isArray(snapshot.ingredients)?snapshot.ingredients:[];
    const preparedItems=Array.isArray(snapshot.preparedItems)?snapshot.preparedItems:[];
    try{
      if(typeof db!=='undefined'&&db){
        db.ingredients=ingredients.slice();
        db.preparedItems=preparedItems.slice();
      }
      if(typeof invalidateDerivedCaches==='function')invalidateDerivedCaches();
      if(typeof renderIngredients==='function')renderIngredients();
      else if(typeof renderAll==='function')renderAll();
      state.hydrations++;
      return true;
    }catch(error){
      state.lastError=String(error?.message||error||'Legacy ingredient hydration failed');
      return false;
    }
  }

  function installLoadCloudGuard(){
    if(originalLoadCloud)return true;
    try{
      if(typeof loadCloud!=='function')return false;
      originalLoadCloud=loadCloud;
      loadCloud=async function(...args){
        if(suppressNextLoadCloud){
          suppressNextLoadCloud=false;
          state.suppressedReloads++;
          hydrateLegacy();
          return {v2:true,suppressed:true};
        }
        return originalLoadCloud.apply(this,args);
      };
      return true;
    }catch(e){return false;}
  }

  async function routedRpc(name,params,...rest){
    if(name!==TARGET_RPC)return originalRpc(name,params,...rest);
    state.calls++;
    state.lastAt=Date.now();
    const core=coreReady();
    if(!core){
      state.fallbacks++;
      return originalRpc(name,params,...rest);
    }
    try{
      const ingredient=params?.p_ingredient;
      const preparedItems=Array.isArray(params?.p_prepared_items)?params.p_prepared_items:[];
      const id=await core.domains.ingredients.save(ingredient,preparedItems);
      hydrateLegacy();
      suppressNextLoadCloud=true;
      state.success++;
      state.lastError='';
      window.dispatchEvent(new CustomEvent('latyen:v2-ingredient-saved',{detail:{id,at:state.lastAt}}));
      return {data:id,error:null,status:200,statusText:'OK'};
    }catch(error){
      suppressNextLoadCloud=false;
      state.errors++;
      state.lastError=String(error?.message||error||'V2 ingredient save failed');
      return {data:null,error,status:400,statusText:'V2 ingredient save failed'};
    }
  }

  function enable(){
    if(state.enabled)return true;
    client=legacySupabase();
    if(!client||typeof client.rpc!=='function'||!coreReady()||!installLoadCloudGuard())return false;
    if(client.rpc?.__lyV2IngredientsTakeover)return true;
    originalRpc=client.rpc.bind(client);
    const wrapper=routedRpc;
    Object.defineProperty(wrapper,'__lyV2IngredientsTakeover',{value:true});
    client.rpc=wrapper;
    state.enabled=true;
    state.phase='active';
    state.lastError='';
    return true;
  }

  function disable(){
    if(client&&originalRpc&&client.rpc?.__lyV2IngredientsTakeover)client.rpc=originalRpc;
    try{if(originalLoadCloud&&typeof loadCloud==='function')loadCloud=originalLoadCloud;}catch(e){}
    suppressNextLoadCloud=false;
    state.enabled=false;
    state.phase='disabled';
  }

  function boot(){
    if(enable())return;
    if(Date.now()-STARTED_AT>=MAX_WAIT_MS){state.phase='idle-no-context';return;}
    setTimeout(boot,500);
  }

  window.__lyFreshCoreV2IngredientsTakeover={version:VERSION,enable,disable,status:()=>({...state})};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});
  else setTimeout(boot,0);
})();
