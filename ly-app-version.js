(()=>{
  'use strict';
  const VERSION='2.1.78',REVISION='fresh-core-v2-authoritative-v84';
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

  function previousVersion(){try{return localStorage.getItem(STORAGE_KEY)||'';}catch(e){return '';}}
  function rememberVersion(){try{localStorage.setItem(STORAGE_KEY,VERSION);}catch(e){}}
  function showUpdateNotice(){
    if(state.updateNoticeShown)return true;
    const previous=previousVersion();
    if(previous===VERSION)return true;
    const notifications=window.__lyInAppNotifications;
    if(typeof notifications?.show!=='function')return false;
    const detail=previous
      ?`Đã cập nhật từ Ver ${previous} lên Ver ${VERSION}. Đã bổ sung trạng thái Fresh Core V3 ngay trong Cài đặt để theo dõi độ khớp dữ liệu, số lần đọc/ghi và giới hạn kiểm tra miễn phí.`
      :`Phần mềm đang sử dụng Ver ${VERSION} · Fresh Core V2.`;
    notifications.show(detail,'Quản Lý Lát Yên',false,'✅');
    rememberVersion();
    state.updateNoticeShown=true;
    return true;
  }

  function boot(){mount();if(!showUpdateNotice())setTimeout(showUpdateNotice,600);}
  window.__LY_APP_VERSION=VERSION;
  window.__LY_APP_VERSION_LABEL=LABEL;
  window.__lyAppVersion={version:VERSION,revision:REVISION,label:LABEL,mount,status:()=>({...state})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  [0,50,250,800,1800,3500,6000].forEach(delay=>setTimeout(mount,delay));
  window.addEventListener?.('focus',mount);
  window.addEventListener?.('latyen:branding-updated',()=>setTimeout(mount,0));
})();
