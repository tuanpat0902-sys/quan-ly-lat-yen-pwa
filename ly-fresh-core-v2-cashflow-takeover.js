(()=>{
  'use strict';
  if(window.__lyFreshCoreV2CashflowTakeoverV1)return;
  window.__lyFreshCoreV2CashflowTakeoverV1=true;

  const VERSION='2026.08.24.3';
  const MAX_WAIT_MS=60000;
  const STARTED_AT=Date.now();
  const TABLE='ly_cashflow_entries';
  const state={version:VERSION,phase:'waiting',enabled:false,calls:0,success:0,errors:0,fallbacks:0,suppressedReloads:0,lastAction:'',lastAt:0,lastError:''};
  let client=null;
  let previousFrom=null;
  let originalLoadCloud=null;
  let suppressNextLoad=false;

  function legacySupabase(){try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}return window.sb||null;}
  function coreReady(){const core=window.__lyFreshCoreV2;const cashflow=core?.domains?.cashflow;return cashflow?.refresh&&cashflow?.create&&cashflow?.update&&cashflow?.remove?core:null;}
  function response(data,error=null){return error?{data:null,error,status:400,statusText:'V2 cashflow mutation failed'}:{data,error:null,status:200,statusText:'OK'};}

  function legacyProjection(entries){
    return (Array.isArray(entries)?entries:[]).map(x=>({
      id:x.id,
      warehouse_id:x.warehouse_id,
      type:x.entry_type,
      date:x.entry_date,
      category:x.category,
      amount:Number(x.amount||0),
      note:x.note||'',
      finance_scope:x.finance_scope||undefined,
      created_at:x.created_at,
      updated_at:x.updated_at
    }));
  }

  function hydrateLegacy(){
    const core=coreReady();
    const entries=core?.store?.getState?.()?.cashflowEntries;
    if(!Array.isArray(entries))return false;
    window.__lyFreshCashflow=legacyProjection(entries);
    try{if(typeof window.invalidateDataIndexes==='function')window.invalidateDataIndexes();else window.invalidateDerivedCaches?.();}catch(e){}
    try{window.renderCashflow?.();}catch(e){}
    try{window.renderCashflowReport?.();}catch(e){}
    return true;
  }

  function armReloadSuppression(){suppressNextLoad=true;}

  function installLoadCloudGuard(){
    if(originalLoadCloud)return true;
    if(typeof window.loadCloud!=='function')return false;
    originalLoadCloud=window.loadCloud;
    const guarded=async function(...args){
      if(suppressNextLoad){
        suppressNextLoad=false;
        if(hydrateLegacy()){
          state.suppressedReloads++;
          return window.__lyFreshCoreV2?.store?.getState?.()||null;
        }
      }
      state.fallbacks++;
      return originalLoadCloud.apply(this,args);
    };
    Object.defineProperty(guarded,'__lyV2CashflowLoadGuard',{value:true});
    window.loadCloud=guarded;
    return true;
  }

  async function saveEntry(entry){
    state.calls++;state.lastAction='upsert';state.lastAt=Date.now();
    const core=coreReady();if(!core)throw new Error('Fresh Core V2 cashflow is not ready');
    await core.domains.cashflow.refresh();
    const current=core.store.getState()?.cashflowEntries;
    const exists=Array.isArray(current)&&current.some(x=>String(x?.id||'')===String(entry?.id||''));
    const data=exists?await core.domains.cashflow.update(entry.id,entry):await core.domains.cashflow.create(entry);
    hydrateLegacy();armReloadSuppression();
    state.success++;state.lastError='';
    window.dispatchEvent(new CustomEvent('latyen:v2-cashflow-mutated',{detail:{action:'upsert',id:entry?.id||data?.id||'',at:state.lastAt}}));
    return response(data);
  }

  function deleteBuilder(){
    const filters={};let executed=null;
    const builder={eq(column,value){filters[String(column)]=value;return builder;},then(resolve,reject){return execute().then(resolve,reject);},catch(reject){return execute().catch(reject);},finally(handler){return execute().finally(handler);}};
    async function execute(){
      if(executed)return executed;
      executed=(async()=>{
        state.calls++;state.lastAction='delete';state.lastAt=Date.now();
        const core=coreReady();if(!core)throw new Error('Fresh Core V2 cashflow is not ready');
        const id=filters.id;if(!id)throw new Error('Cashflow delete requires id');
        const data=await core.domains.cashflow.remove(id);
        hydrateLegacy();armReloadSuppression();
        state.success++;state.lastError='';
        window.dispatchEvent(new CustomEvent('latyen:v2-cashflow-mutated',{detail:{action:'delete',id,at:state.lastAt}}));
        return response(data);
      })().catch(error=>{state.errors++;state.lastError=String(error?.message||error||'V2 cashflow mutation failed');return response(null,error);});
      return executed;
    }
    return builder;
  }

  function cashflowTable(rawTable){return new Proxy(rawTable,{get(target,prop,receiver){if(prop==='upsert')return async(entry)=>{try{return await saveEntry(entry);}catch(error){state.errors++;state.lastError=String(error?.message||error);return response(null,error);}};if(prop==='delete')return ()=>deleteBuilder();const value=Reflect.get(target,prop,receiver);return typeof value==='function'?value.bind(target):value;}});}

  function enable(){
    if(state.enabled)return true;
    client=legacySupabase();
    if(!client||typeof client.from!=='function'||!coreReady()||!installLoadCloudGuard())return false;
    if(client.from?.__lyV2CashflowTakeover)return true;
    previousFrom=client.from.bind(client);
    const wrapper=function(name,...rest){const raw=previousFrom(name,...rest);return String(name)===TABLE?cashflowTable(raw):raw;};
    Object.defineProperty(wrapper,'__lyV2CashflowTakeover',{value:true});
    client.from=wrapper;state.enabled=true;state.phase='active';state.lastError='';return true;
  }

  function disable(){
    if(client&&previousFrom&&client.from?.__lyV2CashflowTakeover)client.from=previousFrom;
    if(originalLoadCloud&&window.loadCloud?.__lyV2CashflowLoadGuard)window.loadCloud=originalLoadCloud;
    suppressNextLoad=false;state.enabled=false;state.phase='disabled';
  }

  function boot(){if(enable())return;if(Date.now()-STARTED_AT>=MAX_WAIT_MS){state.phase='idle-no-context';return;}setTimeout(boot,500);}

  window.__lyFreshCoreV2CashflowTakeover={version:VERSION,enable,disable,status:()=>({...state})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
