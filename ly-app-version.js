(()=>{
  'use strict';
  const VERSION='3.0.12',REVISION='fresh-core-v3-shell-authoritative-v14';
  if(window.__lyAppVersion?.version===VERSION&&window.__lyAppVersion?.revision===REVISION)return;
  const LABEL=`Ver ${VERSION}`,STORAGE_KEY='lat_yen_last_seen_app_version';
  const state={version:VERSION,revision:REVISION,label:LABEL,mounted:false,updateNoticeShown:false};

  function mount(){
    const name=document.getElementById?.('appNameText');
    if(!name)return false;
    let badge=document.getElementById?.('appVersionStatic');
    if(!badge){
      badge=document.createElement?.('span');
      if(!badge)return false;
      badge.id='appVersionStatic';
      badge.className='badge';
      name.insertAdjacentElement?.('afterend',badge);
    }
    badge.textContent=LABEL;
    badge.setAttribute?.('data-ly-app-version',VERSION);
    state.mounted=true;
    return true;
  }

  function ensureScript({globalKey,selector,src,datasetKey}){
    if(window[globalKey])return true;
    if(document.querySelector?.(selector))return true;
    const script=document.createElement?.('script');
    if(!script)return false;
    script.src=src;
    script.async=true;
    script.dataset.lyBootstrap=datasetKey;
    script.onerror=()=>script.remove?.();
    (document.head||document.documentElement).appendChild(script);
    return true;
  }

  function ensureUIStability(){
    if(window.__lyUIStability?.version==='2026.08.28.2')return true;
    if(document.querySelector?.('script[src*="ly-ui-stability.js?v=20260828.2"]'))return true;
    const script=document.createElement?.('script');
    if(!script)return false;
    script.src='./ly-ui-stability.js?v=20260828.2';
    script.async=true;
    script.dataset.lyBootstrap='ui-stability';
    script.onerror=()=>script.remove?.();
    (document.head||document.documentElement).appendChild(script);
    return true;
  }

  function ensureUIFeedback(){
    return ensureScript({
      globalKey:'__lyUIFeedback',
      selector:'script[data-ly-bootstrap="ui-feedback"]',
      src:'./ly-ui-feedback.js?v=20260828.1',
      datasetKey:'ui-feedback'
    });
  }

  function ensureEmployeesParityRunner(){
    if(window.__lyFreshCoreV3EmployeesParityRunner){
      try{window.__lyFreshCoreV3EmployeesParityRunner.render?.();}catch(e){}
      return true;
    }
    if(document.querySelector?.('script[data-ly-bootstrap="v3-6-employees-parity"]'))return true;
    const script=document.createElement?.('script');
    if(!script)return false;
    script.src='./ly-fresh-core-v3-employees-parity-runner.js?v=20260828.3';
    script.async=true;
    script.dataset.lyBootstrap='v3-6-employees-parity';
    script.onload=()=>{try{window.__lyFreshCoreV3EmployeesParityRunner?.render?.();}catch(e){}};
    script.onerror=()=>script.remove?.();
    (document.head||document.documentElement).appendChild(script);
    return true;
  }

  function previousVersion(){try{return localStorage.getItem(STORAGE_KEY)||'';}catch(e){return '';}}
  function rememberVersion(){try{localStorage.setItem(STORAGE_KEY,VERSION);}catch(e){}}
  function showUpdateNotice(){
    if(state.updateNoticeShown)return true;
    const previous=previousVersion();
    if(previous===VERSION)return true;
    const notifications=window.__lyInAppNotifications;
    if(typeof notifications?.show!=='function')return false;
    const detail=previous
      ?`Đã cập nhật từ Ver ${previous} lên Ver ${VERSION}. Đã hoàn thiện lưu chẩn đoán sau reload và chuẩn bị V3-2 Read Candidate có gate kép; V2 vẫn là authority mặc định cho đến khi đủ điều kiện.`
      :`Phần mềm đang sử dụng Ver ${VERSION} · Fresh Core V3.`;
    notifications.show(detail,'Quản Lý Lát Yên',false,'✅');
    rememberVersion();
    state.updateNoticeShown=true;
    return true;
  }

  function boot(){ensureUIStability();ensureUIFeedback();mount();ensureEmployeesParityRunner();if(!showUpdateNotice())setTimeout(showUpdateNotice,600);}
  window.__LY_APP_VERSION=VERSION;
  window.__LY_APP_VERSION_LABEL=LABEL;
  window.__lyAppVersion={version:VERSION,revision:REVISION,label:LABEL,mount,status:()=>({...state})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  [0,50,250,800,1800,3500,6000].forEach(delay=>setTimeout(()=>{ensureUIStability();ensureUIFeedback();mount();ensureEmployeesParityRunner();},delay));
  window.addEventListener?.('focus',()=>{ensureUIStability();ensureUIFeedback();mount();ensureEmployeesParityRunner();});
  window.addEventListener?.('latyen:branding-updated',()=>setTimeout(mount,0));
})();
