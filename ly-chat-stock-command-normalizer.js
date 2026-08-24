(()=>{
'use strict';
const VERSION='2026.08.25.3';
if(window.__lyChatStockCommandNormalizer?.version===VERSION)return;
function loadV4(){
  if(window.__lyChatStockCommandNormalizerV4?.version==='2026.08.25.4')return Promise.resolve(true);
  if(window.__lyChatStockCommandNormalizerV4Loading)return window.__lyChatStockCommandNormalizerV4Loading;
  window.__lyChatStockCommandNormalizerV4Loading=new Promise(resolve=>{
    const script=document.createElement('script');
    script.src='./ly-chat-stock-command-normalizer-v4.js?v=20260825.4';
    script.async=false;
    script.onload=()=>resolve(true);
    script.onerror=()=>resolve(false);
    (document.head||document.documentElement).appendChild(script);
  });
  return window.__lyChatStockCommandNormalizerV4Loading;
}
window.__lyChatStockCommandNormalizer={
  version:VERSION,
  legacyDisabled:true,
  loadV4,
  status:()=>({version:VERSION,legacyDisabled:true,v4:window.__lyChatStockCommandNormalizerV4?.version||''})
};
loadV4();
})();
