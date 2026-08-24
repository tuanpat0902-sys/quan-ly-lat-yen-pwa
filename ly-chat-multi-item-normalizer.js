(()=>{
'use strict';
const VERSION='2026.08.25.2';
if(window.__lyChatMultiItemNormalizer?.version===VERSION)return;
function loadUnified(){
  if(window.__lyChatCommandNormalizer?.version==='2026.08.25.3')return Promise.resolve(true);
  if(window.__lyChatCommandNormalizerLoadingV3)return window.__lyChatCommandNormalizerLoadingV3;
  window.__lyChatCommandNormalizerLoadingV3=new Promise(resolve=>{
    const script=document.createElement('script');
    script.src='./ly-chat-command-normalizer-v3.js?v=20260825.3';
    script.async=false;
    script.onload=()=>resolve(true);
    script.onerror=()=>resolve(false);
    (document.head||document.documentElement).appendChild(script);
  });
  return window.__lyChatCommandNormalizerLoadingV3;
}
window.__lyChatMultiItemNormalizer={version:VERSION,loadUnified,status:()=>({version:VERSION,unified:window.__lyChatCommandNormalizer?.version||''})};
loadUnified();
})();
