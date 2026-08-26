(()=>{
  'use strict';
  if(window.__lyReportsBridgeV1)return;
  window.__lyReportsBridgeV1=true;
  const VERSION='2026.08.27.1';
  const pending=[];
  let hydrateTimer=null;

  function ensure(){
    if(window.__lyReportsModule?.renderReports)return Promise.resolve(true);
    if(window.__lyModuleLoader?.load)return window.__lyModuleLoader.load('reportsUI');
    return Promise.resolve(false);
  }

  function reportsPanelActive(){
    const panel=document.getElementById('reports')||window.E?.reports;
    return !!panel?.classList?.contains('active');
  }

  function refreshVisibleReports(){
    clearTimeout(hydrateTimer);
    hydrateTimer=setTimeout(()=>{
      hydrateTimer=null;
      if(!reportsPanelActive())return;
      try{window.renderReports?.();}catch(error){console.warn('[Lát Yên] reports hydration refresh',error);}
    },80);
  }

  window.renderReports=function(){
    const args=arguments;
    if(window.__lyReportsModule?.renderReports)return window.__lyReportsModule.renderReports.apply(window,args);
    pending.push(args);
    ensure().then(ok=>{
      if(!ok||!window.__lyReportsModule?.renderReports)return;
      while(pending.length)window.__lyReportsModule.renderReports.apply(window,pending.shift());
    });
  };

  window.addEventListener('latyen:v2-hydrated',refreshVisibleReports);
  window.__lyReportsBridge={version:VERSION,refreshVisible:refreshVisibleReports};
})();
