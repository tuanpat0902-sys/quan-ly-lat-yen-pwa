(()=>{
'use strict';
const VERSION='2026.08.25.6';
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
  return true;
}
window.__lyChatUnitNormalizer={version:VERSION,ready,status:()=>({version:VERSION,unified:window.__lyChatCommandNormalizer?.version||'',stockV4:window.__lyChatStockCommandNormalizerV4?.version||''})};
ready();
})();
