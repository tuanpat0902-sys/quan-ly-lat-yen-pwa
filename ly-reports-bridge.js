(()=>{
  'use strict';
  if(window.__lyReportsBridgeV1)return;
  window.__lyReportsBridgeV1=true;
  const pending=[];
  function ensure(){
    if(window.__lyReportsModule?.renderReports)return Promise.resolve(true);
    if(window.__lyModuleLoader?.load)return window.__lyModuleLoader.load('reportsUI');
    return Promise.resolve(false);
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
})();
