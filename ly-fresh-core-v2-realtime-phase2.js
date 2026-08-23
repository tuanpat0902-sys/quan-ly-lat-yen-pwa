(()=>{
  'use strict';
  if(window.__lyFreshCoreV2RealtimePhase2V1)return;
  window.__lyFreshCoreV2RealtimePhase2V1=true;

  const VERSION='2026.08.23.1';
  const MAX_WAIT_MS=60000;
  const STARTED_AT=Date.now();
  const state={version:VERSION,phase:'waiting',enabled:false,v2Connected:false,retired:0,restored:0,suppressedSetupCalls:0,lastAt:0,lastError:''};
  let originalSetupRealtime=null;
  let offStatus=null;

  function client(){try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}return window.sb||null;}
  function v2(){return window.__lyFreshCoreV2Realtime||null;}
  function core(){return window.__lyFreshCoreV2||null;}

  function removeLegacyFreshChannel(){
    const c=client();
    const ch=window.__lyFreshRealtime;
    if(ch&&c&&typeof c.removeChannel==='function'){
      try{c.removeChannel(ch);state.retired++;}catch(error){state.lastError=String(error?.message||error||'removeChannel failed');}
    }
    window.__lyFreshRealtime=null;
    if(window.__lyFreshReloadTimer){clearTimeout(window.__lyFreshReloadTimer);window.__lyFreshReloadTimer=null;}
    state.lastAt=Date.now();
  }

  function installGuard(){
    if(!originalSetupRealtime&&typeof window.setupRealtime==='function')originalSetupRealtime=window.setupRealtime;
    if(!originalSetupRealtime)return false;
    if(window.setupRealtime?.__lyV2RealtimePhase2)return true;
    const guarded=function(...args){
      const status=v2()?.status?.()||{};
      if(status.connected){
        state.suppressedSetupCalls++;
        state.v2Connected=true;
        removeLegacyFreshChannel();
        return v2()?.enable?.();
      }
      state.v2Connected=false;
      return originalSetupRealtime.apply(this,args);
    };
    Object.defineProperty(guarded,'__lyV2RealtimePhase2',{value:true});
    window.setupRealtime=guarded;
    return true;
  }

  function restoreLegacyFreshChannel(){
    if(!originalSetupRealtime||window.__lyFreshRealtime)return;
    try{originalSetupRealtime();state.restored++;state.lastAt=Date.now();}
    catch(error){state.lastError=String(error?.message||error||'legacy realtime restore failed');}
  }

  function applyStatus(payload){
    const connected=payload?.connected===true||v2()?.status?.().connected===true;
    state.v2Connected=connected;
    if(connected){
      removeLegacyFreshChannel();
      state.phase='active-v2';
      state.lastError='';
    }else{
      state.phase='fallback-legacy';
      restoreLegacyFreshChannel();
    }
  }

  function enable(){
    if(state.enabled)return true;
    const c=core(),rt=v2();
    if(!c||!rt||typeof rt.status!=='function'||typeof c.events?.on!=='function')return false;
    if(!installGuard())return false;
    offStatus=c.events.on('realtime:status',applyStatus);
    state.enabled=true;
    applyStatus(rt.status());
    return true;
  }

  function disable(){
    offStatus?.();offStatus=null;
    if(originalSetupRealtime&&window.setupRealtime?.__lyV2RealtimePhase2)window.setupRealtime=originalSetupRealtime;
    state.enabled=false;
    state.phase='disabled';
    if(!window.__lyFreshRealtime)restoreLegacyFreshChannel();
  }

  function boot(){
    if(enable())return;
    if(Date.now()-STARTED_AT>=MAX_WAIT_MS){state.phase='idle-no-context';return;}
    setTimeout(boot,500);
  }

  window.__lyFreshCoreV2RealtimePhase2={version:VERSION,enable,disable,status:()=>({...state})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
