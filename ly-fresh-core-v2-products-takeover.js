(()=>{
  'use strict';
  if(window.__lyFreshCoreV2ProductsTakeoverV1)return;
  window.__lyFreshCoreV2ProductsTakeoverV1=true;

  const VERSION='2026.08.24.4';
  const TARGET_RPC='ly_save_product';
  const TARGET_TABLE='ly_products';
  const MAX_WAIT_MS=60000;
  const STARTED_AT=Date.now();
  const state={version:VERSION,phase:'waiting',enabled:false,calls:0,success:0,errors:0,fallbacks:0,hydrations:0,suppressedReloads:0,lastAction:'',lastAt:0,lastError:''};
  let client=null,previousRpc=null,previousFrom=null,fromWrapper=null,originalLoadCloud=null,suppressNextLoadCloud=false;

  function legacySupabase(){try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}return window.sb||null;}
  function coreReady(){const core=window.__lyFreshCoreV2;return core?.domains?.products?.save&&core?.domains?.products?.remove&&core?.store?.getState?core:null;}
  function response(data,error=null){return error?{data:null,error,status:400,statusText:'V2 product mutation failed'}:{data,error:null,status:200,statusText:'OK'};}

  function hydrateLegacy(){
    const core=coreReady();if(!core)return false;const snapshot=core.store.getState()||{};
    const products=Array.isArray(snapshot.products)?snapshot.products:[];const recipeItems=Array.isArray(snapshot.recipeItems)?snapshot.recipeItems:[];
    try{
      if(typeof db!=='undefined'&&db){db.products=products.slice();db.recipeItems=recipeItems.slice();}
      if(typeof invalidateDataIndexes==='function')invalidateDataIndexes();else if(typeof invalidateDerivedCaches==='function')invalidateDerivedCaches();
      if(typeof renderRecipes==='function')renderRecipes();if(typeof renderSales==='function')renderSales();if(typeof renderDashboard==='function')renderDashboard();else if(typeof renderAll==='function')renderAll();
      state.hydrations++;return true;
    }catch(error){state.lastError=String(error?.message||error||'Legacy products hydration failed');return false;}
  }

  function installLoadCloudGuard(){
    if(originalLoadCloud)return true;
    try{if(typeof loadCloud!=='function')return false;originalLoadCloud=loadCloud;loadCloud=async function(...args){if(suppressNextLoadCloud){suppressNextLoadCloud=false;state.suppressedReloads++;hydrateLegacy();return {v2:true,suppressed:true};}return originalLoadCloud.apply(this,args);};return true;}catch(e){return false;}
  }

  async function routedRpc(name,params,...rest){
    if(name!==TARGET_RPC)return previousRpc(name,params,...rest);
    state.calls++;state.lastAction='save';state.lastAt=Date.now();const core=coreReady();if(!core){state.fallbacks++;return previousRpc(name,params,...rest);}
    try{
      const product=params?.p_product;const recipeItems=Array.isArray(params?.p_recipe_items)?params.p_recipe_items:[];
      const id=await core.domains.products.save(product,recipeItems);
      hydrateLegacy();suppressNextLoadCloud=true;state.success++;state.lastError='';
      window.dispatchEvent(new CustomEvent('latyen:v2-product-saved',{detail:{id,at:state.lastAt}}));
      return {data:id,error:null,status:200,statusText:'OK'};
    }catch(error){suppressNextLoadCloud=false;state.errors++;state.lastError=String(error?.message||error||'V2 product save failed');return response(null,error);}
  }

  function deleteBuilder(){
    const filters={};let executed=null;
    const builder={eq(column,value){filters[String(column)]=value;return builder;},select(){return builder;},then(resolve,reject){return execute().then(resolve,reject);},catch(reject){return execute().catch(reject);},finally(handler){return execute().finally(handler);}};
    async function execute(){
      if(executed)return executed;
      executed=(async()=>{
        state.calls++;state.lastAction='delete';state.lastAt=Date.now();const core=coreReady();if(!core)throw new Error('Fresh Core V2 products is not ready');
        const id=filters.id;if(!id)throw new Error('Product delete requires id');
        const data=await core.domains.products.remove(id);
        hydrateLegacy();suppressNextLoadCloud=true;state.success++;state.lastError='';
        window.dispatchEvent(new CustomEvent('latyen:v2-product-removed',{detail:{id,at:state.lastAt}}));
        return response(data);
      })().catch(error=>{suppressNextLoadCloud=false;state.errors++;state.lastError=String(error?.message||error||'V2 product delete failed');return response(null,error);});
      return executed;
    }
    return builder;
  }

  function wrapTable(raw){return new Proxy(raw,{get(target,prop,receiver){if(prop==='delete')return ()=>deleteBuilder();const value=Reflect.get(target,prop,receiver);return typeof value==='function'?value.bind(target):value;}});}

  function enable(){
    if(state.enabled)return true;
    client=legacySupabase();if(!client||typeof client.rpc!=='function'||typeof client.from!=='function'||!coreReady()||!installLoadCloudGuard())return false;
    previousRpc=client.rpc.bind(client);previousFrom=client.from.bind(client);
    const rpcWrapper=routedRpc;Object.defineProperty(rpcWrapper,'__lyV2ProductsTakeover',{value:true});client.rpc=rpcWrapper;
    fromWrapper=function(name,...rest){const raw=previousFrom(name,...rest);return String(name)===TARGET_TABLE?wrapTable(raw):raw;};
    Object.defineProperty(fromWrapper,'__lyV2ProductsDeleteTakeover',{value:true});client.from=fromWrapper;
    state.enabled=true;state.phase='active';state.lastError='';return true;
  }

  function disable(){
    if(client&&previousRpc&&client.rpc?.__lyV2ProductsTakeover)client.rpc=previousRpc;
    if(client&&previousFrom&&client.from===fromWrapper)client.from=previousFrom;
    try{if(originalLoadCloud&&typeof loadCloud==='function')loadCloud=originalLoadCloud;}catch(e){}
    suppressNextLoadCloud=false;state.enabled=false;state.phase='disabled';
  }

  function boot(){if(enable())return;if(Date.now()-STARTED_AT>=MAX_WAIT_MS){state.phase='idle-no-context';return;}setTimeout(boot,500);}
  window.__lyFreshCoreV2ProductsTakeover={version:VERSION,enable,disable,status:()=>({...state})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
