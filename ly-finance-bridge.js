(()=>{
  'use strict';
  if(window.__lyFinanceBridgeV1)return;
  window.__lyFinanceBridgeV1=true;
  const VERSION='2026.08.23.1';
  function dispatch(name,args){
    const loader=window.__lyModuleLoader;
    if(!loader?.load)return false;
    loader.load('financeUI').then(ok=>{
      if(!ok)return;
      const fn=window[name];
      if(typeof fn==='function'&&fn!==bridge[name])fn(...args);
    });
    return true;
  }
  const bridge={
    renderFinance(...args){dispatch('renderFinance',args);},
    renderFinanceData(...args){dispatch('renderFinanceData',args);}
  };
  if(typeof window.renderFinance!=='function')window.renderFinance=bridge.renderFinance;
  if(typeof window.renderFinanceData!=='function')window.renderFinanceData=bridge.renderFinanceData;
  window.__lyFinanceBridge={version:VERSION};
})();
