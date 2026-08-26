(()=>{
  'use strict';
  const VERSION='2026.08.27.1';
  if(window.__lyChatLocalOnly?.version===VERSION)return;

  let patched=false;
  let attempts=0;
  let timer=null;

  function patchAssistantStatus(){
    const assistant=window.__lyLocalAssistant;
    if(!assistant||assistant.__lyLocalOnlyStatusPatched)return;
    const originalStatus=typeof assistant.status==='function'?assistant.status.bind(assistant):()=>({});
    assistant.status=()=>({
      ...originalStatus(),
      ai:'local-only-no-external-ai',
      aiMode:'local',
      aiRetryAt:0,
      lastAiError:''
    });
    assistant.__lyLocalOnlyStatusPatched=true;
  }

  function patchSupabaseClient(){
    const client=window.sb;
    const functions=client?.functions;
    if(!functions||typeof functions.invoke!=='function')return false;
    if(functions.__lyLocalOnlyPatched){patched=true;return true;}

    const originalInvoke=functions.invoke.bind(functions);
    functions.invoke=(name,options)=>{
      if(String(name)==='lat-yen-chat'){
        return Promise.resolve({data:null,error:{message:'LOCAL_ONLY_CHAT'}});
      }
      return originalInvoke(name,options);
    };
    functions.__lyLocalOnlyPatched=true;
    patched=true;
    return true;
  }

  function sync(){
    attempts+=1;
    patchAssistantStatus();
    patchSupabaseClient();
    const badge=document.getElementById?.('lyAssistantMode');
    if(badge){badge.textContent='Trên thiết bị';badge.dataset.mode='local';}
    if(patched&&window.__lyLocalAssistant&&timer){clearInterval(timer);timer=null;}
  }

  sync();
  timer=setInterval(()=>{
    sync();
    if(attempts>=120&&timer){clearInterval(timer);timer=null;}
  },250);

  window.addEventListener('latyen:hydrated',sync);
  window.addEventListener('latyen:v2-hydrated',sync);
  window.__lyChatLocalOnly={
    version:VERSION,
    enabled:true,
    sync,
    status:()=>({version:VERSION,enabled:true,patched,attempts,externalAi:false})
  };
})();
