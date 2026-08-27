(()=>{
  'use strict';
  if(window.__lyNavigationOwnerV1)return;
  window.__lyNavigationOwnerV1=true;
  const VERSION='2026.08.27.1';
  const VALID=new Set(['dashboard','ingredients','imports','recipes','sales','stocktake','finance','cashflow','employees','warehouses','history','settings']);
  const state={panel:'',changes:0,reconciles:0,lastError:'',installed:false,baseShowTab:null,baseRenderPanel:null};

  const norm=id=>VALID.has(String(id||''))?String(id):'sales';
  const buttonFor=id=>document.querySelector(`#nav button[data-panel="${CSS.escape(id)}"]`);
  function remember(panel){try{localStorage.setItem('lat_yen_active_panel_v1',panel)}catch(e){}}

  function reconcile(panel,btn){
    const id=norm(panel);
    document.querySelectorAll('.panel').forEach(el=>el.classList.toggle('active',el.id===id));
    document.querySelectorAll('#nav button[data-panel]').forEach(el=>el.classList.toggle('active',el===btn||el.dataset.panel===id));
    const target=document.getElementById(id);
    if(target&&!target.classList.contains('active'))target.classList.add('active');
    state.reconciles++;
  }

  function activate(panel,btn){
    const id=norm(panel),button=btn||buttonFor(id);
    state.panel=id;state.changes++;remember(id);
    reconcile(id,button);
    try{state.baseRenderPanel?.call(window,id);}catch(error){state.lastError=String(error?.message||error);}
    requestAnimationFrame(()=>{
      reconcile(id,button);
      const target=document.getElementById(id);
      if(target&&!target.innerHTML.trim()){
        try{state.baseRenderPanel?.call(window,id);}catch(error){state.lastError=String(error?.message||error);}
      }
    });
    return true;
  }

  function install(){
    if(typeof window.showTab!=='function'||typeof window.renderPanel!=='function')return false;
    if(window.showTab===activate){state.installed=true;return true;}
    state.baseShowTab=window.showTab;
    state.baseRenderPanel=window.renderPanel;
    window.showTab=activate;
    state.installed=true;
    const current=document.querySelector('.panel.active')?.id||'sales';
    reconcile(norm(current),buttonFor(norm(current)));
    return true;
  }

  function boot(){
    if(install())return;
    let tries=0;
    const retry=()=>{tries++;if(install()||tries>=200)return;setTimeout(retry,25);};
    retry();
  }

  window.__lyNavigationOwner={version:VERSION,install,activate,reconcile,status:()=>({...state,activePanel:document.querySelector('.panel.active')?.id||''})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();