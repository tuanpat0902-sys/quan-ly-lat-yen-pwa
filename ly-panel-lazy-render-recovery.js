(()=>{
  'use strict';
  const VERSION='2026.08.29.2';
  if(window.__lyPanelLazyRenderRecovery?.version===VERSION)return;

  const inflight=new Map();
  const activePanel=()=>document.querySelector?.('.panel.active')?.id||'';

  function loadScript(src,key,test){
    if(test?.())return Promise.resolve(true);
    if(inflight.has(key))return inflight.get(key);
    const existing=document.querySelector?.(`script[data-ly-lazy-recovery="${key}"]`);
    if(existing){
      const pending=new Promise(resolve=>{
        const done=()=>resolve(Boolean(test?.()));
        existing.addEventListener?.('load',done,{once:true});
        existing.addEventListener?.('error',()=>resolve(false),{once:true});
        setTimeout(done,1200);
      });
      inflight.set(key,pending);return pending.finally(()=>inflight.delete(key));
    }
    const pending=new Promise(resolve=>{
      const s=document.createElement?.('script');
      if(!s){resolve(false);return;}
      s.src=src;s.async=true;s.dataset.lyLazyRecovery=key;
      s.onload=()=>resolve(Boolean(test?.()));
      s.onerror=()=>{s.remove?.();resolve(false);};
      (document.head||document.documentElement).appendChild(s);
    });
    inflight.set(key,pending);return pending.finally(()=>inflight.delete(key));
  }

  async function recoverHistory(){
    let ok=false;
    try{ok=await window.__lyModuleLoader?.load?.('activityHistory');}catch(e){}
    if(!ok)ok=await loadScript('./ly-activity-history.js?v=20260825.1','activity-history',()=>window.__lyActivityHistoryModule?.version==='2026.08.25.1');
    if(!ok||activePanel()!=='history')return false;
    try{window.renderHistory?.();return true;}catch(e){console.warn('[Lát Yên] History lazy render recovery',e);return false;}
  }

  async function ensureSpecialReportsBridge(){
    if(window.__lySpecialReportsBridge?.version==='2026.08.29.3')return true;
    return loadScript('./ly-special-reports-bridge.js?v=20260829.3','special-reports-bridge',()=>window.__lySpecialReportsBridge?.version==='2026.08.29.3');
  }

  async function recoverSales(){
    const bridgeReady=await ensureSpecialReportsBridge();
    if(!bridgeReady)return false;
    let loaded=false;
    try{loaded=await window.__lySpecialReportsBridge?.load?.();}catch(e){}
    if(!loaded||activePanel()!=='sales')return false;
    if(!document.getElementById?.('saleReportArea'))return true;
    try{window.renderSaleReport?.();window.__lySalesReportRevenueCard?.sync?.();return true;}catch(e){console.warn('[Lát Yên] Sales report lazy render recovery',e);return false;}
  }

  function recover(panel){
    if(panel==='history')return recoverHistory();
    if(panel==='sales')return recoverSales();
    return Promise.resolve(false);
  }

  window.addEventListener?.('latyen:panel',event=>{const panel=String(event?.detail?.panel||'');queueMicrotask(()=>recover(panel));});
  window.addEventListener?.('pageshow',()=>{const panel=activePanel();if(panel==='history'||panel==='sales')setTimeout(()=>recover(panel),0);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{const panel=activePanel();if(panel==='history'||panel==='sales')recover(panel);},{once:true});
  else {const panel=activePanel();if(panel==='history'||panel==='sales')recover(panel);}

  window.__lyPanelLazyRenderRecovery=Object.freeze({version:VERSION,recover,status:()=>({version:VERSION,activePanel:activePanel(),inflight:[...inflight.keys()]})});
})();
