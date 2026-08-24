(()=>{
'use strict';
const VERSION='2026.08.25.1';
if(window.__lyChatMultiItemNormalizer?.version===VERSION)return;
function loadUnified(){
  if(window.__lyChatCommandNormalizer?.version==='2026.08.25.1')return Promise.resolve(true);
  if(window.__lyChatCommandNormalizerLoading)return window.__lyChatCommandNormalizerLoading;
  window.__lyChatCommandNormalizerLoading=new Promise(resolve=>{
    const script=document.createElement('script');
    script.src='./ly-chat-command-normalizer.js?v=20260825.1';
    script.async=false;
    script.onload=()=>resolve(true);
    script.onerror=()=>resolve(false);
    (document.head||document.documentElement).appendChild(script);
  });
  return window.__lyChatCommandNormalizerLoading;
}
window.__lyChatMultiItemNormalizer={version:VERSION,loadUnified,status:()=>({version:VERSION,unified:window.__lyChatCommandNormalizer?.version||''})};
loadUnified();
})();
