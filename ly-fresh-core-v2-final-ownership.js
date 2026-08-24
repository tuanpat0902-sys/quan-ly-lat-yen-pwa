(()=>{
  'use strict';
  if(window.__lyFreshCoreV2FinalOwnershipV4)return;
  window.__lyFreshCoreV2FinalOwnershipV4=true;

  const VERSION='2026.08.24.4';
  const state={
    version:VERSION,phase:'waiting',active:false,refreshes:0,initialHydrates:0,
    projections:0,deferredProjections:0,deferredRenders:0,retries:0,lastAt:0,lastError:''
  };
  let retryTimer=null,projectionTimer=null,pendingProjectionReason='';

  function core(){return window.__lyFreshCoreV2||null;}
  function hydration(){return window.__lyFreshCoreV2LegacyHydration||null;}
  function draftActive(){try{return window.v240HasActiveDraft?.()===true;}catch(e){return false;}}

  function renderLegacyShell(){
    try{window.invalidateDataIndexes?.();}catch(e){}
    try{window.invalidateDerivedCaches?.();}catch(e){}
    try{window.cacheSave?.();window.flushCacheSave?.();}catch(e){}
    const safe=typeof window.v235RequestBackgroundRender==='function'
      ?window.v235RequestBackgroundRender
      :typeof window.v219SafeBackgroundRender==='function'?window.v219SafeBackgroundRender:null;
    if(safe){
      try{if(safe()===false)state.deferredRenders++;return true;}
      catch(error){state.lastError=String(error?.message||error);return false;}
    }
    try{window.renderWarehouseSelect?.();}catch(e){}
    if(typeof window.renderAll==='function'){
      try{window.renderAll();return true;}catch(error){state.lastError=String(error?.message||error);return false;}
    }
    for(const name of ['renderDashboard','renderIngredients','renderProducts','renderInventory','renderWarehouses','renderSales','renderCashflow','renderSettings']){
      try{window[name]?.();}catch(e){}
    }
    return true;
  }

  function scheduleProjection(reason){
    pendingProjectionReason=reason||pendingProjectionReason||'deferred';
    clearTimeout(projectionTimer);
    projectionTimer=setTimeout(()=>{
      projectionTimer=null;
      const next=pendingProjectionReason;
      if(!next)return;
      if(draftActive()){
        window.v240MarkProjectionDeferred?.();
        scheduleProjection(next);
        return;
      }
      pendingProjectionReason='';
      projectCurrentState(`deferred:${next}`);
    },700);
  }

  function projectCurrentState(reason='current'){
    const c=core(),h=hydration();
    if(!c||typeof h?.hydrate!=='function'||typeof c.store?.getState!=='function')return false;
    if(draftActive()){
      state.deferredProjections++;
      state.phase='active-deferred';
      window.v240MarkProjectionDeferred?.();
      scheduleProjection(reason);
      return true;
    }
    try{
      if(h.hydrate(c.store.getState())!==true)return false;
      renderLegacyShell();
      state.projections++;
      state.lastAt=Date.now();
      state.lastError='';
      state.phase='active';
      pendingProjectionReason='';
      window.v240ClearDeferredStatus?.();
      return true;
    }catch(error){
      state.lastError=String(error?.message||error||'Fresh Core V2 projection failed');
      return false;
    }
  }

  function hydrateCurrentState(){
    const before=state.projections;
    const ok=projectCurrentState('initial');
    if(ok&&state.projections>before)state.initialHydrates++;
    return ok;
  }

  async function waitForCore(timeout=15000){
    const started=Date.now();
    while(Date.now()-started<timeout){
      const c=core(),h=hydration();
      if(c&&typeof c.refreshCoreDomains==='function'&&typeof h?.hydrate==='function')return c;
      try{window.__lyFreshCoreV2Shadow?.refresh?.();}catch(e){}
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    return null;
  }

  async function refreshFromV2(reason='manual'){
    state.phase='waiting-core';
    const c=await waitForCore(),h=hydration();
    if(!c||typeof h?.hydrate!=='function'){
      state.phase='waiting';state.lastError='';return false;
    }
    state.phase='refreshing';
    await c.refreshCoreDomains();
    if(!projectCurrentState(`refresh:${reason}`)){
      state.phase='recovering';state.lastError='Fresh Core V2 hydration failed';return false;
    }
    state.refreshes++;
    state.lastAt=Date.now();
    state.lastError='';
    if(!pendingProjectionReason)state.phase='active';
    return true;
  }

  function scheduleRecovery(){
    if(retryTimer)return;
    retryTimer=setTimeout(async()=>{
      retryTimer=null;state.retries++;
      try{if(!await refreshFromV2('recovery'))scheduleRecovery();}
      catch(error){state.lastError=String(error?.message||error);state.phase='recovering';scheduleRecovery();}
    },800);
  }

  function install(){
    if(state.active)return true;
    const c=core(),h=hydration();
    if(!c||typeof c.refreshCoreDomains!=='function'||typeof h?.hydrate!=='function'||typeof c.store?.getState!=='function')return false;
    const authoritative=async()=>{
      try{return await refreshFromV2('authoritative');}
      catch(error){state.lastError=String(error?.message||error);scheduleRecovery();return false;}
    };
    Object.defineProperty(authoritative,'__lyFreshCoreV2Authoritative',{value:true});
    window.loadCloud=authoritative;
    window.autoSyncNow=authoritative;
    window.__lyFreshCoreMode='fresh-core-v2-only';
    window.__lyLegacyDataRuntimeRetired=true;
    state.active=true;
    state.phase='hydrating';
    if(!hydrateCurrentState()){state.phase='recovering';scheduleRecovery();}
    state.lastAt=Date.now();
    window.dispatchEvent?.(new CustomEvent('latyen:fresh-core-v2-authoritative',{detail:{version:VERSION,mode:window.__lyFreshCoreMode}}));
    return true;
  }

  function boot(){
    if(install())return;
    state.phase='waiting-shadow';
    try{window.__lyFreshCoreV2Shadow?.refresh?.();}catch(e){}
    setTimeout(boot,250);
  }

  window.__lyFreshCoreV2FinalOwnership={
    version:VERSION,install,refresh:refreshFromV2,hydrate:hydrateCurrentState,
    flushProjection:()=>projectCurrentState(pendingProjectionReason||'manual'),
    status:()=>({...state,pendingProjection:pendingProjectionReason,mode:window.__lyFreshCoreMode||''})
  };
  window.addEventListener?.('latyen:v2-shadow-ready',()=>setTimeout(boot,0));
  if(document.readyState==='loading')document.addEventListener?.('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});
  else setTimeout(boot,0);
})();
