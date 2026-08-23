(()=>{
'use strict';
if(window.__lyUiBootstrapRescue)return;
const VERSION='2026.08.24.2';
const state={version:VERSION,attempts:0,success:false,lastError:'',lastAt:0};
function call(name,...args){try{const fn=window[name];if(typeof fn==='function'){fn(...args);return true;}}catch(e){state.lastError=String(e?.message||e);}return false;}
function hydrateFromV2(){
  try{
    const core=window.__lyFreshCoreV2;
    const hydration=window.__lyFreshCoreV2LegacyHydration;
    const snapshot=core?.store?.getState?.();
    if(snapshot&&typeof hydration?.hydrate==='function')return hydration.hydrate(snapshot)!==false;
  }catch(e){state.lastError=String(e?.message||e);}
  return false;
}
function rescue(){
  state.attempts++;state.lastAt=Date.now();
  try{
    hydrateFromV2();
    call('applyAppBrand');
    call('navInit');
    call('restoreNavGroupStateV238');
    call('installSaleHandler');
    call('invalidateDataIndexes');
    call('invalidateDerivedCaches');
    call('renderWarehouseSelect');
    if(typeof window.renderAll==='function')window.renderAll();
    else call('renderPanel',window.activePanelId||'ingredients');
    window.__lyVersionInfo?.render?.();
    window.__lyAppVersion?.mount?.();
    const nav=document.getElementById('nav');
    const panel=document.querySelector('.panel.active');
    state.success=!!(nav&&nav.children.length&&panel&&panel.innerHTML.trim());
    if(state.success){
      document.documentElement.setAttribute('data-ly-ui-ready','1');
      window.dispatchEvent?.(new CustomEvent('latyen:ui-rescued',{detail:{version:VERSION,attempts:state.attempts}}));
    }
  }catch(e){state.lastError=String(e?.message||e);}
  return state.success;
}
function boot(){
  const delays=[0,100,300,700,1200,2000,3500,6000,10000];
  delays.forEach(ms=>setTimeout(()=>{if(!state.success)rescue();},ms));
}
window.__lyUiBootstrapRescue={version:VERSION,rescue,status:()=>({...state})};
window.addEventListener?.('latyen:v2-shadow-ready',()=>setTimeout(rescue,0));
window.addEventListener?.('latyen:fresh-core-v2-authoritative',()=>setTimeout(rescue,0));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
