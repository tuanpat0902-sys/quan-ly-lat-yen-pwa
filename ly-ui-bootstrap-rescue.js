(()=>{
'use strict';
if(window.__lyUiBootstrapRescue)return;
const VERSION='2026.08.27.4';
const state={version:VERSION,attempts:0,success:false,lastError:'',lastAt:0,targetedRenders:0};

function activePanel(){
  return window.__lyFreshCoreV3?.store?.getState?.()?.activePanel||document.querySelector('.panel.active')?.id||window.activePanelId||'sales';
}
function activeButton(id){
  try{return document.querySelector(`#nav button[data-panel="${CSS.escape(id)}"]`);}catch(_){return null;}
}
function shellReady(id=activePanel()){
  const nav=document.getElementById('nav');
  const panel=document.getElementById(id);
  return !!(nav?.querySelector('button[data-panel]')&&panel?.classList.contains('active')&&panel.innerHTML.trim());
}
function targetedRender(id){
  try{
    const router=window.__lyFreshCoreV3?.router;
    router?.reconcile?.(id,activeButton(id));
    if(shellReady(id))return true;
    if(typeof window.renderPanel==='function'){
      window.renderPanel(id);
      state.targetedRenders++;
    }
    router?.ensureRendered?.(id,activeButton(id),0);
    return shellReady(id);
  }catch(e){
    state.lastError=String(e?.message||e);
    return false;
  }
}
function rescue(){
  state.attempts++;state.lastAt=Date.now();
  try{
    const router=window.__lyFreshCoreV3?.router;
    if(router?.authoritative!==true){
      window.__lyFreshCoreV3Runtime?.boot?.();
      return false;
    }
    const id=activePanel();
    router.install?.();
    router.reconcile?.(id,activeButton(id));
    if(!shellReady(id))targetedRender(id);
    window.__lyVersionInfo?.render?.();
    window.__lyAppVersion?.mount?.();
    state.success=shellReady(id);
    if(state.success){
      document.documentElement.setAttribute('data-ly-ui-ready','1');
      window.dispatchEvent?.(new CustomEvent('latyen:ui-rescued',{detail:{version:VERSION,attempts:state.attempts,panel:id}}));
    }
  }catch(e){state.lastError=String(e?.message||e);}
  return state.success;
}
function boot(){
  [0,120,350,800,1600,3000,6000].forEach(ms=>setTimeout(()=>{if(!state.success)rescue();},ms));
}
window.__lyUiBootstrapRescue={version:VERSION,rescue,status:()=>({...state,activePanel:activePanel()})};
window.addEventListener?.('latyen:fresh-core-v3-authoritative',()=>setTimeout(rescue,0));
window.addEventListener?.('latyen:panel',event=>{const id=event?.detail?.panel;if(id)setTimeout(()=>targetedRender(id),35);});
window.addEventListener?.('latyen:panel-render-failed',event=>{const id=event?.detail?.panel;if(id)setTimeout(()=>targetedRender(id),0);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();