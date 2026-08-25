(()=>{
  'use strict';
  if(window.__lyHistoryBridgeV1)return;
  window.__lyHistoryBridgeV1=true;
  const VERSION='2026.08.25.1';
  let loading=null;

  function fallbackLoad(){
    return new Promise(resolve=>{
      if(window.__lyActivityHistoryModule){resolve(window.__lyActivityHistoryModule);return;}
      const existing=document.querySelector('script[data-ly-module="activityHistory"]');
      if(existing){
        existing.addEventListener('load',()=>resolve(window.__lyActivityHistoryModule||null),{once:true});
        existing.addEventListener('error',()=>resolve(null),{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src='./ly-activity-history.js?v=20260825.1';
      s.async=true;
      s.dataset.lyModule='activityHistory';
      s.onload=()=>resolve(window.__lyActivityHistoryModule||null);
      s.onerror=()=>resolve(null);
      (document.head||document.documentElement).appendChild(s);
    });
  }

  function ensure(){
    if(window.__lyActivityHistoryModule)return Promise.resolve(window.__lyActivityHistoryModule);
    if(loading)return loading;
    const viaLoader=window.__lyModuleLoader?.load?.('activityHistory');
    loading=Promise.resolve(viaLoader||fallbackLoad())
      .then(()=>window.__lyActivityHistoryModule||null)
      .catch(()=>null)
      .finally(()=>{if(!window.__lyActivityHistoryModule)loading=null;});
    return loading;
  }

  function bridgeRender(){
    const args=arguments;
    return ensure().then(mod=>{
      if(mod?.render)return mod.render.apply(window,args);
      console.warn('[Lát Yên] Không tải được module Lịch sử hoạt động');
      return undefined;
    });
  }

  window.renderHistory=bridgeRender;
  window.__lyHistoryBridge={version:VERSION,ensure,status:()=>({version:VERSION,loaded:!!window.__lyActivityHistoryModule,loading:!!loading})};
})();
