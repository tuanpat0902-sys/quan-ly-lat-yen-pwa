(()=>{
  'use strict';
  if(window.__lyIndependentBootstrapV4)return;
  window.__lyIndependentBootstrapV4=true;

  const VERSION=window.__LY_APP_VERSION||window.__lyAppVersion?.version||'2.1.30';
  const REVISION=window.__lyAppVersion?.revision||'fresh-core-v2-authoritative-v31';
  const state={version:VERSION,revision:REVISION,startedAt:Date.now(),attempts:0,ready:false,shellRepairs:0,diagnosticRenders:0,lastDiagnosticKey:'',lastError:'',firstError:'',lastAt:0};
  const text=value=>String(value??'');

  function recordError(error){
    const message=text(error?.message||error||'Unknown startup error');
    if(/runtime not ready/i.test(message))return;
    if(!state.firstError)state.firstError=message;
    state.lastError=message;
    state.lastAt=Date.now();
    renderDiagnostic();
  }

  window.addEventListener?.('error',event=>recordError(event?.error||event?.message));
  window.addEventListener?.('unhandledrejection',event=>recordError(event?.reason));

  function status(){
    const shadow=window.__lyFreshCoreV2Shadow?.status?.()||{};
    const final=window.__lyFreshCoreV2FinalOwnership?.status?.()||{};
    return{shadow,final,hasCore:!!window.__lyFreshCoreV2,hasHydration:!!window.__lyFreshCoreV2LegacyHydration,hasNavInit:typeof window.navInit==='function',hasRenderAll:typeof window.renderAll==='function'};
  }

  function ensureHost(){
    let host=document.getElementById('lyIndependentBootstrapStatus');
    if(host)return host;
    host=document.createElement('div');
    host.id='lyIndependentBootstrapStatus';
    host.style.cssText='margin:14px;padding:14px;border:1px solid #d0d5dd;border-radius:14px;background:#fff;color:#17202a;font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 6px 18px rgba(16,24,40,.06)';
    (document.querySelector('main')||document.body).prepend(host);
    return host;
  }

  function renderDiagnostic(){
    if(state.ready)return;
    const snapshot=status();
    const live=window.__LY_APP_VERSION||window.__lyAppVersion?.version||VERSION;
    const shadowDetail=snapshot.shadow.error?`${text(snapshot.shadow.phase)} · ${text(snapshot.shadow.error)}`:text(snapshot.shadow.phase||'chưa khởi tạo');
    const key=[live,snapshot.hasCore,snapshot.hasHydration,shadowDetail,snapshot.final.phase||'waiting',snapshot.hasNavInit,snapshot.hasRenderAll,state.firstError].join('|');
    if(key===state.lastDiagnosticKey)return;
    state.lastDiagnosticKey=key;
    state.diagnosticRenders++;
    const host=ensureHost();
    host.innerHTML=`<div style="font-weight:800;font-size:17px;margin-bottom:6px">QUẢN LÝ LÁT YÊN · Ver ${live}</div><div style="color:#667085;margin-bottom:10px">Đang khởi động Fresh Core V2…</div><div style="display:grid;grid-template-columns:auto 1fr;gap:5px 10px;font-size:12px"><b>Core</b><span>${snapshot.hasCore?'đã tải':'chưa tải'}</span><b>Hydration</b><span>${snapshot.hasHydration?'đã tải':'chưa tải'}</span><b>Shadow</b><span>${shadowDetail}</span><b>Final ownership</b><span>${text(snapshot.final.phase||'waiting')}</span><b>Legacy shell</b><span>${snapshot.hasNavInit&&snapshot.hasRenderAll?'sẵn sàng':'chưa sẵn sàng'}</span>${state.firstError?`<b>Lỗi đầu tiên</b><span style="color:#b42318;word-break:break-word">${state.firstError.replace(/[&<>]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[character]))}</span>`:''}</div><button id="lyBootstrapRetryBtn" style="margin-top:12px;padding:8px 11px;border:1px solid #0f766e;border-radius:9px;background:#0f766e;color:#fff">Thử khởi động lại</button>`;
    host.querySelector('#lyBootstrapRetryBtn')?.addEventListener('click',()=>attempt(true));
  }

  function minimalNav(){
    const nav=document.getElementById('nav');
    if(!nav||nav.querySelector('button[data-panel]'))return false;
    const items=[['ingredients','Nguyên liệu'],['sales','Bán hàng'],['imports','Nhập / xuất kho'],['stocktake','Kiểm kê'],['warehouses','Kho / Chi nhánh'],['settings','Cài đặt']];
    nav.innerHTML=items.map(([id,label])=>`<button type="button" data-panel="${id}" data-ly-independent-panel="${id}">${label}</button>`).join('');
    nav.querySelectorAll('[data-ly-independent-panel]').forEach(button=>button.addEventListener('click',()=>window.showTab?.(button.dataset.panel,button)));
    return true;
  }

  function shellReady(){
    const nav=document.getElementById('nav');
    const panel=document.querySelector('.panel.active');
    return !!(nav?.querySelector('button[data-panel]')&&panel?.innerHTML?.trim());
  }

  function repairShell(){
    let repaired=false;
    const nav=document.getElementById('nav');
    if(!nav?.querySelector('button[data-panel]')){
      try{window.navInit?.();repaired=true;}catch(error){recordError(error);}
      if(minimalNav())repaired=true;
    }
    if(window.__lyFreshCoreV2&&!document.querySelector('.panel.active')?.innerHTML?.trim()){
      try{window.__lyFreshCoreV2LegacyHydration?.hydrate?.(window.__lyFreshCoreV2.store?.getState?.());}catch(error){recordError(error);}
      try{window.renderWarehouseSelect?.();window.renderAll?.();repaired=true;}catch(error){recordError(error);}
    }
    if(repaired)state.shellRepairs++;
    return repaired;
  }

  async function attempt(force=false){
    if(state.ready&&!force)return true;
    state.attempts++;
    state.lastAt=Date.now();
    if(!window.__lyFreshCoreV2){
      try{await(window.__lyFreshCoreV2Shadow?.boot?.()||window.__lyFreshCoreV2Shadow?.refresh?.());}catch(error){recordError(error);}
    }
    if(window.__lyFreshCoreV2){
      try{await window.__lyFreshCoreV2FinalOwnership?.install?.();}catch(error){recordError(error);}
    }
    if(!shellReady())repairShell();
    const snapshot=status();
    const ok=!!(snapshot.hasCore&&snapshot.shadow.phase==='ready'&&snapshot.final.active&&shellReady());
    if(ok){
      state.ready=true;
      document.getElementById('lyIndependentBootstrapStatus')?.remove();
      document.documentElement.setAttribute('data-ly-independent-ready','1');
      return true;
    }
    renderDiagnostic();
    return false;
  }

  function boot(){
    renderDiagnostic();
    [0,250,700,1500,3000,6000,10000,15000].forEach(delay=>setTimeout(()=>{if(!state.ready)attempt(false);},delay));
  }

  window.__lyIndependentBootstrap={version:VERSION,revision:REVISION,attempt,status:()=>({...state,...status()})};
  window.addEventListener?.('latyen:v2-shadow-ready',()=>{if(!state.ready)setTimeout(()=>attempt(false),0);});
  window.addEventListener?.('latyen:fresh-core-v2-authoritative',()=>{if(!state.ready)setTimeout(()=>attempt(false),0);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
