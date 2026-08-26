(()=>{
  'use strict';
  if(window.__lyFinanceBridgeV1)return;
  window.__lyFinanceBridgeV1=true;
  const VERSION='2026.08.27.1';
  let hydrateTimer=null;

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

  function financePanelActive(){
    const panel=document.getElementById('finance')||window.E?.finance;
    return !!panel?.classList?.contains('active');
  }

  function refreshVisibleFinance(){
    clearTimeout(hydrateTimer);
    hydrateTimer=setTimeout(()=>{
      hydrateTimer=null;
      if(!financePanelActive())return;
      try{
        if(typeof window.renderFinanceData==='function')window.renderFinanceData();
        else if(typeof window.renderFinance==='function')window.renderFinance();
      }catch(error){console.warn('[Lát Yên] finance hydration refresh',error);}
    },80);
  }

  const bridge={
    renderFinance(...args){dispatch('renderFinance',args);},
    renderFinanceData(...args){dispatch('renderFinanceData',args);}
  };
  if(typeof window.renderFinance!=='function')window.renderFinance=bridge.renderFinance;
  if(typeof window.renderFinanceData!=='function')window.renderFinanceData=bridge.renderFinanceData;
  window.addEventListener('latyen:v2-hydrated',refreshVisibleFinance);
  window.__lyFinanceBridge={version:VERSION,refreshVisible:refreshVisibleFinance};
})();
