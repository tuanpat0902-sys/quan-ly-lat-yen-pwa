(()=>{
'use strict';
const VERSION='2026.08.25.1';
if(window.__lyChatStockSubmitGate?.version===VERSION)return;
function relevant(event){
  if(event.type==='click')return !!event.target?.closest?.('[data-assistant-send]');
  return event.type==='keydown'&&event.key==='Enter'&&!event.shiftKey&&event.target?.id==='lyAssistantInput';
}
function handle(event){
  if(!relevant(event))return;
  const input=document.getElementById('lyAssistantInput');
  if(!input?.value)return;
  const resolver=window.__lyChatStockCommandNormalizerV4;
  if(!resolver?.process)return;
  const result=resolver.process(input);
  if(result?.allow!==false)return;
  event.preventDefault();
  event.stopImmediatePropagation();
}
function install(){
  if(document.documentElement?.dataset?.lyStockSubmitGate==='1')return true;
  document.documentElement.dataset.lyStockSubmitGate='1';
  document.addEventListener('click',handle,true);
  document.addEventListener('keydown',handle,true);
  return true;
}
window.__lyChatStockSubmitGate={version:VERSION,install,status:()=>({version:VERSION,installed:document.documentElement?.dataset?.lyStockSubmitGate==='1',resolver:window.__lyChatStockCommandNormalizerV4?.version||''})};
install();
})();
