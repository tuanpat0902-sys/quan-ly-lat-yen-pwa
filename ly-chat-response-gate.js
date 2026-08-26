(()=>{
  'use strict';
  const VERSION='2026.08.27.1';
  if(window.__lyChatResponseGate?.version===VERSION)return;
  let lastUser='';
  function deterministic(message){
    try{return window.__lyChatRouter?.route?.(message)||window.__lyChatInventoryQuery?.inventoryReply?.(message)||window.__lyChatSalesInsights?.insightReply?.(message)||window.__lyChatSalesQuery?.salesReply?.(message)||null;}catch(_){return null;}
  }
  function apply(value){
    if(!value||typeof value!=='object')return value;
    if(value.role==='user'){lastUser=String(value.content||'').trim();return value;}
    if(value.role!=='assistant'||value.draft||!lastUser)return value;
    const reply=deterministic(lastUser);if(!reply?.content)return value;
    value.content=String(reply.content);value.suggestions=reply.suggestions||null;return value;
  }
  function patchIndexedDb(){
    const proto=globalThis.IDBObjectStore?.prototype;if(!proto?.put||proto.put.__lyChatResponseGate)return false;
    const original=proto.put;const wrapped=function(value,...rest){try{if(this?.name==='messages')apply(value);}catch(_){}return original.call(this,value,...rest);};
    wrapped.__lyChatResponseGate=true;wrapped.__lyOriginal=original;proto.put=wrapped;return true;
  }
  function sync(){patchIndexedDb();}
  sync();
  window.addEventListener?.('latyen:hydrated',sync);window.addEventListener?.('latyen:v2-hydrated',sync);
  window.__lyChatResponseGate={version:VERSION,apply,deterministic,sync,status:()=>({version:VERSION,enabled:true,lastUser:Boolean(lastUser)})};
})();