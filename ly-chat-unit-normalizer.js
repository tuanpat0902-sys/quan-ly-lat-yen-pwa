(()=>{
'use strict';
const VERSION='2026.08.25.7';
if(window.__lyChatUnitNormalizer?.version===VERSION)return;
function loadScript(src,key){
  if(window[key])return window[key];
  window[key]=new Promise(resolve=>{
    const script=document.createElement('script');
    script.src=src;
    script.async=false;
    script.onload=()=>resolve(true);
    script.onerror=()=>resolve(false);
    (document.head||document.documentElement).appendChild(script);
  });
  return window[key];
}
async function ready(){
  if(window.__lyChatCommandNormalizer?.version!=='2026.08.25.3'&&window.__lyChatMultiItemNormalizer?.loadUnified)await window.__lyChatMultiItemNormalizer.loadUnified();
  if(window.__lyChatStockCommandNormalizerV4?.version!=='2026.08.25.4')await loadScript('./ly-chat-stock-command-normalizer-v4.js?v=20260825.4','__lyChatStockCommandNormalizerLoadingV4');
  if(window.__lyChatStockSubmitGate?.version!=='2026.08.25.1')await loadScript('./ly-chat-stock-submit-gate.js?v=20260825.1','__lyChatStockSubmitGateLoadingV1');
  return true;
}
window.__lyChatUnitNormalizer={version:VERSION,ready,status:()=>({version:VERSION,unified:window.__lyChatCommandNormalizer?.version||'',stockV4:window.__lyChatStockCommandNormalizerV4?.version||'',gate:window.__lyChatStockSubmitGate?.version||''})};
ready();
})();
