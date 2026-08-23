(()=>{
'use strict';
if(window.__lyFreshCoreV2ResumeRefreshV1)return;
window.__lyFreshCoreV2ResumeRefreshV1=true;
const VERSION='2026.08.23.1';
const ARM_MS=3000;
const state={version:VERSION,enabled:false,foregrounds:0,refreshes:0,coalesced:0,errors:0,lastAt:0,lastError:''};
let originalLoadCloud=null,armedUntil=0,pendingRefresh=null;
function coreReady(){const core=window.__lyFreshCoreV2;const shadow=window.__lyFreshCoreV2Shadow?.status?.();const org=String(window.__lyFreshOrgId||'');if(!core?.refreshCoreDomains||!shadow||shadow.phase!=='ready'||!org||String(shadow.orgId||'')!==org)return null;return core;}
function startRefresh(){const core=coreReady();if(!core)return null;if(pendingRefresh){state.coalesced++;return pendingRefresh;}state.refreshes++;pendingRefresh=Promise.resolve().then(()=>core.refreshCoreDomains()).catch(error=>{state.errors++;state.lastError=String(error?.message||error||'Foreground V2 refresh failed');throw error;}).finally(()=>{pendingRefresh=null;});return pendingRefresh;}
function arm(){if(document.hidden||!navigator.onLine||!coreReady())return;state.foregrounds++;state.lastAt=Date.now();armedUntil=state.lastAt+ARM_MS;startRefresh();}
function install(){if(state.enabled)return true;let fn=null;try{if(typeof loadCloud==='function')fn=loadCloud}catch(e){}if(!fn&&typeof window.loadCloud==='function')fn=window.loadCloud;if(typeof fn!=='function')return false;originalLoadCloud=fn;const wrapped=async function(...args){if(armedUntil&&Date.now()<=armedUntil){armedUntil=0;const p=pendingRefresh||startRefresh();if(p){try{await p;}catch(e){/* Legacy load remains the fallback path below. */}}}else if(armedUntil){armedUntil=0;}return originalLoadCloud.apply(this,args);};Object.defineProperty(wrapped,'__lyV2ResumeRefresh',{value:true});try{window.loadCloud=wrapped}catch(e){}try{loadCloud=wrapped}catch(e){}window.addEventListener('visibilitychange',arm,true);state.enabled=true;return true;}
function disable(){try{window.removeEventListener('visibilitychange',arm,true)}catch(e){}try{if(originalLoadCloud)window.loadCloud=originalLoadCloud}catch(e){}try{if(originalLoadCloud)loadCloud=originalLoadCloud}catch(e){}armedUntil=0;pendingRefresh=null;state.enabled=false;}
function boot(){if(install())return;setTimeout(boot,500)}
window.__lyFreshCoreV2ResumeRefresh={version:VERSION,enable:install,disable,status:()=>({...state})};
setTimeout(boot,0);
})();
