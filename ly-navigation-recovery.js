(()=>{
  'use strict';
  if(window.__lyNavigationRecoveryV1)return;
  window.__lyNavigationRecoveryV1=true;
  const VERSION='2026.08.27.1';
  const state={clicks:0,recoveries:0,lastPanel:'',lastError:''};

  const panelButton=target=>target?.closest?.('#nav button[data-panel]')||null;
  const activePanel=()=>document.querySelector('.panel.active')?.id||'';

  function normalizeVisual(panel,btn){
    document.querySelectorAll('#nav button[data-panel]').forEach(el=>el.classList.toggle('active',el===btn||el.dataset.panel===panel));
    document.querySelectorAll('.panel').forEach(el=>el.classList.toggle('active',el.id===panel));
  }

  function invoke(panel,btn){
    if(typeof window.showTab!=='function')return false;
    try{window.showTab(panel,btn);return true;}catch(error){state.lastError=String(error?.message||error);return false;}
  }

  function verify(panel,btn,attempt=0){
    if(activePanel()===panel){
      normalizeVisual(panel,btn);
      return true;
    }
    if(attempt>=3){
      state.recoveries++;
      normalizeVisual(panel,btn);
      try{window.renderPanel?.(panel);}catch(error){state.lastError=String(error?.message||error);}
      return false;
    }
    invoke(panel,btn);
    setTimeout(()=>verify(panel,btn,attempt+1),90*(attempt+1));
    return false;
  }

  function activate(panel,btn){
    if(!panel)return;
    state.clicks++;state.lastPanel=panel;
    invoke(panel,btn);
    requestAnimationFrame(()=>verify(panel,btn,0));
  }

  document.addEventListener('click',event=>{
    const btn=panelButton(event.target);
    if(!btn)return;
    activate(String(btn.dataset.panel||''),btn);
  },true);

  window.addEventListener('pageshow',()=>{
    const panel=activePanel();
    const btn=panel?document.querySelector(`#nav button[data-panel="${CSS.escape(panel)}"]`):null;
    if(panel&&btn)normalizeVisual(panel,btn);
  });

  window.__lyNavigationRecovery={version:VERSION,activate,status:()=>({...state,activePanel:activePanel()})};
})();