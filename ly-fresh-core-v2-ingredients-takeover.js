(()=>{
  'use strict';
  if(window.__lyFreshCoreV2IngredientsTakeoverV1)return;
  window.__lyFreshCoreV2IngredientsTakeoverV1=true;

  const VERSION='2026.08.23.3';
  const TARGET_RPC='ly_save_ingredient';
  const TARGET_TABLE='ly_ingredients';
  const MAX_WAIT_MS=60000;
  const STARTED_AT=Date.now();
  const state={version:VERSION,phase:'waiting',enabled:false,calls:0,success:0,errors:0,fallbacks:0,hydrations:0,suppressedReloads:0,lastAction:'',lastAt:0,lastError:''};
  let client=null,originalRpc=null,previousFrom=null,fromWrapper=null,originalLoadCloud=null,suppressNextLoadCloud=false;

  function legacySupabase(){try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}return window.sb||null;}
  function coreReady(){const core=window.__lyFreshCoreV2;return core?.domains?.ingredients?.save&&core?.domains?.ingredients?.remove&&core?.store?.getState?core:null;}
  function response(data,error=null){return error?{data:null,error,status:400,statusText:'V2 ingredient mutation failed'}:{data,error:null,status:200,statusText:'OK'};}

  function hydrateLegacy(){
    const core=coreReady();if(!core)return false;
    const snapshot=core.store.getState()||{};
    const ingredients=Array.isArray(snapshot.ingredients)?snapshot.ingredients:[];
    const preparedItems=Array.isArray(snapshot.preparedItems)?snapshot.preparedItems:[];
    try{
      if(typeof db!=='undefined'&&db){db.ingredients=ingredients.slice();db.preparedItems=preparedItems.slice();}
      if(typeof invalidateDerivedCaches==='function')invalidateDerivedCaches();
      if(typeof renderIngredients==='function')renderIngredients();else if(typeof renderAll==='function')renderAll();
      state.hydrations++;return true;
    }catch(error){state.lastError=String(error?.message||error||'Legacy ingredient hydration failed');return false;}
  }

  function installLoadCloudGuard(){
    if(originalLoadCloud)return true;
    try{if(typeof loadCloud!=='function')return false;originalLoadCloud=loadCloud;loadCloud=async function(...args){if(suppressNextLoadCloud){suppressNextLoadCloud=false;state.suppressedReloads++;hydrateLegacy();return {v2:true,suppressed:true};}return originalLoadCloud.apply(this,args);};return true;}catch(e){return false;}
  }

  async function routedRpc(name,params,...rest){
    if(name!==TARGET_RPC)return originalRpc(name,params,...rest);
    state.calls++;state.lastAction='save';state.lastAt=Date.now();const core=coreReady();
    if(!core){state.fallbacks++;return originalRpc(name,params,...rest);}
    try{
      const ingredient=params?.p_ingredient;const preparedItems=Array.isArray(params?.p_prepared_items)?params.p_prepared_items:[];
      const id=await core.domains.ingredients.save(ingredient,preparedItems);
      hydrateLegacy();suppressNextLoadCloud=true;state.success++;state.lastError='';
      window.dispatchEvent(new CustomEvent('latyen:v2-ingredient-saved',{detail:{id,at:state.lastAt}}));
      return {data:id,error:null,status:200,statusText:'OK'};
    }catch(error){suppressNextLoadCloud=false;state.errors++;state.lastError=String(error?.message||error||'V2 ingredient save failed');return response(null,error);}
  }

  function deleteBuilder(){
    const filters={};let executed=null;
    const builder={eq(column,value){filters[String(column)]=value;return builder;},select(){return builder;},then(resolve,reject){return execute().then(resolve,reject);},catch(reject){return execute().catch(reject);},finally(handler){return execute().finally(handler);}};
    async function execute(){
      if(executed)return executed;
      executed=(async()=>{
        state.calls++;state.lastAction='delete';state.lastAt=Date.now();const core=coreReady();if(!core)throw new Error('Fresh Core V2 ingredients is not ready');
        const id=filters.id;if(!id)throw new Error('Ingredient delete requires id');
        const data=await core.domains.ingredients.remove(id);
        hydrateLegacy();suppressNextLoadCloud=true;state.success++;state.lastError='';
        window.dispatchEvent(new CustomEvent('latyen:v2-ingredient-removed',{detail:{id,at:state.lastAt}}));
        return response(data);
      })().catch(error=>{suppressNextLoadCloud=false;state.errors++;state.lastError=String(error?.message||error||'V2 ingredient delete failed');return response(null,error);});
      return executed;
    }
    return builder;
  }

  function wrapTable(raw){return new Proxy(raw,{get(target,prop,receiver){if(prop==='delete')return ()=>deleteBuilder();const value=Reflect.get(target,prop,receiver);return typeof value==='function'?value.bind(target):value;}});}

  function enable(){
    if(state.enabled)return true;
    client=legacySupabase();if(!client||typeof client.rpc!=='function'||typeof client.from!=='function'||!coreReady()||!installLoadCloudGuard())return false;
    originalRpc=client.rpc.bind(client);previousFrom=client.from.bind(client);
    const rpcWrapper=routedRpc;Object.defineProperty(rpcWrapper,'__lyV2IngredientsTakeover',{value:true});client.rpc=rpcWrapper;
    fromWrapper=function(name,...rest){const raw=previousFrom(name,...rest);return String(name)===TARGET_TABLE?wrapTable(raw):raw;};
    Object.defineProperty(fromWrapper,'__lyV2IngredientsDeleteTakeover',{value:true});client.from=fromWrapper;
    state.enabled=true;state.phase='active';state.lastError='';return true;
  }

  function disable(){
    if(client&&originalRpc&&client.rpc?.__lyV2IngredientsTakeover)client.rpc=originalRpc;
    if(client&&previousFrom&&client.from===fromWrapper)client.from=previousFrom;
    try{if(originalLoadCloud&&typeof loadCloud==='function')loadCloud=originalLoadCloud;}catch(e){}
    suppressNextLoadCloud=false;state.enabled=false;state.phase='disabled';
  }

  function boot(){if(enable())return;if(Date.now()-STARTED_AT>=MAX_WAIT_MS){state.phase='idle-no-context';return;}setTimeout(boot,500);}
  window.__lyFreshCoreV2IngredientsTakeover={version:VERSION,enable,disable,status:()=>({...state})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
