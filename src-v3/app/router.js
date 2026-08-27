const DEFAULT_PANELS=Object.freeze(['dashboard','ingredients','imports','recipes','sales','stocktake','finance','cashflow','employees','warehouses','history','settings']);

export function createRouter({store,events,legacyNavigate,panels=DEFAULT_PANELS,storageKey='lat_yen_active_panel_v1'}={}){
  const allowed=new Set(panels);
  let legacy=typeof legacyNavigate==='function'?legacyNavigate:null;
  const state={installed:false,navigations:0,reconciles:0,lastPanel:'',lastError:''};
  const normalize=id=>allowed.has(String(id||''))?String(id):'sales';
  const buttonFor=id=>document.querySelector(`#nav button[data-panel="${CSS.escape(id)}"]`);

  function remember(panel){try{localStorage.setItem(storageKey,panel)}catch(_){}}
  function reconcile(panel,button){
    document.querySelectorAll('.panel').forEach(el=>el.classList.toggle('active',el.id===panel));
    document.querySelectorAll('#nav button[data-panel]').forEach(el=>{
      const active=el===button||el.dataset.panel===panel;
      el.classList.toggle('active',active);
      if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
    });
    state.reconciles++;
  }

  function navigate(panel,button){
    const id=normalize(panel),btn=button||buttonFor(id);
    state.navigations++;state.lastPanel=id;
    store?.patch?.({activePanel:id},{source:'v3-router'});
    remember(id);
    try{legacy?.call(window,id,btn);}catch(error){state.lastError=String(error?.message||error);}
    reconcile(id,btn);
    requestAnimationFrame(()=>reconcile(id,btn));
    events?.emit?.('panel:changed',{panel:id,source:'v3-router'});
    try{window.dispatchEvent(new CustomEvent('latyen:panel',{detail:{panel:id,source:'v3'}}));}catch(_){}
    return true;
  }

  function install({windowObject=window}={}){
    if(state.installed&&windowObject.showTab===navigate)return true;
    if(typeof windowObject.showTab!=='function')return false;
    if(windowObject.showTab!==navigate)legacy=windowObject.showTab;
    windowObject.showTab=navigate;
    state.installed=true;
    const current=normalize(document.querySelector('.panel.active')?.id||store?.getState?.()?.activePanel||'sales');
    store?.patch?.({activePanel:current},{source:'v3-router-install'});
    reconcile(current,buttonFor(current));
    return true;
  }

  return Object.freeze({
    version:'3.0.0-router.1',
    authoritative:true,
    navigate,install,reconcile,
    status:()=>({...state,activePanel:store?.getState?.()?.activePanel||''})
  });
}
