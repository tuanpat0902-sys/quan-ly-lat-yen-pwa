(()=>{
'use strict';
if(window.__lyFreshCoreV2FinalOwnership)return;
const VERSION='2026.08.24.1';
const state={version:VERSION,phase:'waiting',active:false,refreshes:0,legacyFallbacks:0,lastAt:0,lastError:''};
let originalLoadCloud=null;
let originalAutoSyncNow=null;

function core(){return window.__lyFreshCoreV2||null;}
function hydration(){return window.__lyFreshCoreV2LegacyHydration||null;}
function renderLegacyShell(){
  try{window.invalidateDataIndexes?.();}catch(e){}
  try{window.invalidateDerivedCaches?.();}catch(e){}
  try{window.renderWarehouseSelect?.();}catch(e){}
  if(typeof window.renderAll==='function')window.renderAll();
  else{
    ['renderDashboard','renderIngredients','renderProducts','renderInventory','renderWarehouses','renderSales','renderCashflow','renderSettings'].forEach(name=>{try{window[name]?.();}catch(e){}});
  }
  try{window.updateCloudStatus?.();}catch(e){}
}
async function refreshFromV2(){
  const c=core();const h=hydration();
  if(!c||typeof c.refreshCoreDomains!=='function'||typeof h?.hydrate!=='function')throw new Error('Fresh Core V2 runtime not ready');
  await c.refreshCoreDomains();
  if(h.hydrate(c.store.getState())!==true)throw new Error('Fresh Core V2 hydration failed');
  renderLegacyShell();
  state.refreshes++;state.lastAt=Date.now();state.lastError='';
  return true;
}
function retireLegacyRealtime(){
  try{window.__lyFreshCoreV2RealtimePhase2?.enable?.();}catch(e){}
  try{if(window.__lyFreshRealtime&&window.sb?.removeChannel)window.sb.removeChannel(window.__lyFreshRealtime);}catch(e){}
  window.__lyFreshRealtime=null;
  if(window.__lyFreshReloadTimer){try{clearTimeout(window.__lyFreshReloadTimer);}catch(e){}window.__lyFreshReloadTimer=null;}
}
function install(){
  if(state.active)return true;
  const c=core(),h=hydration();
  if(!c||typeof c.refreshCoreDomains!=='function'||typeof h?.hydrate!=='function')return false;
  if(!originalLoadCloud&&typeof window.loadCloud==='function')originalLoadCloud=window.loadCloud;
  if(!originalAutoSyncNow&&typeof window.autoSyncNow==='function')originalAutoSyncNow=window.autoSyncNow;
  const authoritative=async function(){
    try{return await refreshFromV2();}
    catch(error){state.lastError=String(error?.message||error);state.legacyFallbacks++;throw error;}
  };
  Object.defineProperty(authoritative,'__lyFreshCoreV2Authoritative',{value:true});
  window.loadCloud=authoritative;
  window.autoSyncNow=authoritative;
  window.__lyFreshCoreMode='fresh-core-v2-only';
  window.__lyLegacyDataRuntimeRetired=true;
  retireLegacyRealtime();
  state.phase='active';state.active=true;state.lastAt=Date.now();state.lastError='';
  window.dispatchEvent?.(new CustomEvent('latyen:fresh-core-v2-authoritative',{detail:{version:VERSION,mode:window.__lyFreshCoreMode}}));
  return true;
}
function boot(){
  if(install())return;
  state.phase='waiting';
  setTimeout(boot,300);
}
window.__lyFreshCoreV2FinalOwnership={
  version:VERSION,
  install,
  refresh:refreshFromV2,
  status:()=>({...state,mode:window.__lyFreshCoreMode||''})
};
window.addEventListener?.('latyen:v2-shadow-ready',()=>setTimeout(boot,0));
if(document.readyState==='loading')document.addEventListener?.('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
