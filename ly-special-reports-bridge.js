/* Lát Yên — Special Reports Bridge V1 */
(()=>{
  'use strict';
  if(window.__lySpecialReportsBridge)return;
  const VERSION='2026.08.23.1';
  let loading=null;
  const stubs={};
  function load(){
    if(window.__lySpecialReportsModule)return Promise.resolve(true);
    if(loading)return loading;
    loading=new Promise(resolve=>{
      const s=document.createElement('script');
      s.src='./ly-special-reports.js?v=20260823.1';
      s.async=true;
      s.onload=()=>resolve(true);
      s.onerror=()=>{loading=null;resolve(false)};
      (document.head||document.documentElement).appendChild(s);
    });
    return loading;
  }
  function install(name){
    if(typeof window[name]==='function')return;
    const stub=function(...args){
      return load().then(ok=>{
        if(!ok)return false;
        const fn=window[name];
        if(typeof fn!=='function'||fn===stub)return false;
        return fn(...args);
      });
    };
    stubs[name]=stub;
    window[name]=stub;
  }
  ['renderImportReport','renderExportReport','renderSaleReport'].forEach(install);
  window.__lySpecialReportsBridge={version:VERSION,load,status:()=>({version:VERSION,loaded:!!window.__lySpecialReportsModule})};
})();
