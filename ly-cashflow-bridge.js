(()=>{
  'use strict';
  if(window.__lyCashflowBridgeV1)return;
  window.__lyCashflowBridgeV1=true;
  function load(){return window.__lyModuleLoader?.load?.('cashflowUI')||Promise.resolve(false)}
  if(typeof window.renderCashflow!=='function')window.renderCashflow=function(){load().then(ok=>{if(ok&&window.__lyCashflowModule?.renderCashflow)window.__lyCashflowModule.renderCashflow()})};
  if(typeof window.renderCashflowReport!=='function')window.renderCashflowReport=function(){load().then(ok=>{if(ok&&window.__lyCashflowModule?.renderCashflowReport)window.__lyCashflowModule.renderCashflowReport()})};
})();
