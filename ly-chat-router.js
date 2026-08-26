(()=>{
  'use strict';
  const VERSION='2026.08.27.1';
  if(window.__lyChatRouter?.version===VERSION)return;
  function route(message){
    const insights=window.__lyChatSalesInsights?.insightReply?.(message);if(insights)return insights;
    const inventory=window.__lyChatInventoryQuery?.inventoryReply?.(message);if(inventory)return inventory;
    const sales=window.__lyChatSalesQuery?.salesReply?.(message);if(sales)return sales;
    return null;
  }
  function patch(){
    const assistant=window.__lyLocalAssistant;if(!assistant||assistant.__lyDeterministicRouterV1)return false;
    const legacy=typeof assistant.assistantReply==='function'?assistant.assistantReply.bind(assistant):null;if(!legacy)return false;
    assistant.assistantReply=(message,...rest)=>route(message)||legacy(message,...rest);
    const oldStatus=typeof assistant.status==='function'?assistant.status.bind(assistant):()=>({});assistant.status=()=>({...oldStatus(),deterministicRouter:VERSION});
    assistant.__lyDeterministicRouterV1=true;return true;
  }
  function ready(){return Boolean(window.__lyChatSalesInsights&&window.__lyChatInventoryQuery&&window.__lyChatSalesQuery);}
  function sync(){if(ready())patch();}
  window.addEventListener?.('latyen:hydrated',sync);window.addEventListener?.('latyen:v2-hydrated',sync);sync();
  const timer=setInterval(()=>{if(ready()&&patch())clearInterval(timer);},150);setTimeout(()=>clearInterval(timer),30000);
  window.__lyChatRouter={version:VERSION,route,patch,sync,status:()=>({version:VERSION,enabled:true,ready:ready()})};
})();
