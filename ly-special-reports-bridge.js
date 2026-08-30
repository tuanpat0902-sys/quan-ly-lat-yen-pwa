/* Lát Yên — Special Reports Bridge V1 */
(()=>{
  'use strict';
  if(window.__lySpecialReportsBridgeV4)return;
  window.__lySpecialReportsBridgeV4=true;
  const VERSION='2026.08.29.3';
  let loading=null;
  const stubs={};
  function loadRevenueCard(){
    if(window.__lySalesReportRevenueCard?.version==='2026.08.29.3'){window.__lySalesReportRevenueCard.sync?.();return Promise.resolve(true);}
    return new Promise(resolve=>{
      const existing=document.querySelector?.('script[data-ly-sales-revenue-card]');if(existing){setTimeout(()=>{window.__lySalesReportRevenueCard?.sync?.();resolve(Boolean(window.__lySalesReportRevenueCard));},0);return;}
      const s=document.createElement('script');s.src='./ly-sales-report-revenue-card.js?v=20260829.3';s.async=true;s.dataset.lySalesRevenueCard='1';s.onload=()=>{window.__lySalesReportRevenueCard?.sync?.();resolve(true);};s.onerror=()=>resolve(false);(document.head||document.documentElement).appendChild(s);
    });
  }
  function load(){
    if(window.__lySpecialReportsModule){loadRevenueCard();return Promise.resolve(true);}
    if(loading)return loading;
    loading=new Promise(resolve=>{
      const s=document.createElement('script');
      s.src='./ly-special-reports.js?v=20260830.1';
      s.async=true;
      s.onload=()=>{loadRevenueCard();resolve(true);};
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
  loadRevenueCard();
  window.__lySpecialReportsBridge={version:VERSION,load,loadRevenueCard,status:()=>({version:VERSION,loaded:!!window.__lySpecialReportsModule,revenueCard:!!window.__lySalesReportRevenueCard})};
})();
