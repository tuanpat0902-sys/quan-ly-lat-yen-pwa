(()=>{
'use strict';
const VERSION='2026.08.25.3';
if(window.__lyChatUnitNormalizer?.version===VERSION)return;
async function ready(){
  if(window.__lyChatCommandNormalizer?.version==='2026.08.25.3')return true;
  if(window.__lyChatMultiItemNormalizer?.loadUnified)return window.__lyChatMultiItemNormalizer.loadUnified();
  return false;
}
window.__lyChatUnitNormalizer={version:VERSION,ready,status:()=>({version:VERSION,unified:window.__lyChatCommandNormalizer?.version||''})};
ready();
})();
