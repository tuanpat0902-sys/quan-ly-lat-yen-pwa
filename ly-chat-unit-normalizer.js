(()=>{
'use strict';
const VERSION='2026.08.25.8';
if(window.__lyChatUnitNormalizer?.version===VERSION)return;
async function ready(){
  if(window.__lyChatCommandNormalizer?.version!=='2026.08.25.3'&&window.__lyChatMultiItemNormalizer?.loadUnified)await window.__lyChatMultiItemNormalizer.loadUnified();
  return true;
}
window.__lyChatUnitNormalizer={version:VERSION,ready,status:()=>({version:VERSION,unified:window.__lyChatCommandNormalizer?.version||'',stockCore:window.__lyChatStockCoreV5?.version||''})};
ready();
})();
