(()=>{
'use strict';
if(window.__lyAppVersion)return;
const VERSION='2.0.0';
const LABEL=`Ver ${VERSION}`;
const STORAGE_KEY='lat_yen_last_seen_app_version';
const state={version:VERSION,label:LABEL,badgeMounted:false,updateNoticeShown:false};

function mountBadge(){
  const brand=document.querySelector('.brand');
  if(!brand)return false;
  let badge=document.getElementById('lyAppVersionBadge');
  if(!badge){
    badge=document.createElement('span');
    badge.id='lyAppVersionBadge';
    badge.textContent=LABEL;
    badge.title=`Phiên bản phần mềm ${VERSION}`;
    badge.style.cssText='display:inline-flex;align-items:center;margin-left:7px;padding:2px 6px;border-radius:999px;background:#eef4f3;color:#667085;border:1px solid #dbe7e5;font-size:10px;font-weight:750;line-height:1.35;vertical-align:middle;white-space:nowrap;letter-spacing:.01em';
    const small=brand.querySelector('small');
    if(small)brand.insertBefore(badge,small);else brand.appendChild(badge);
  }else badge.textContent=LABEL;
  state.badgeMounted=true;
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
  const detail=previous?`Đã cập nhật phần mềm từ Ver ${previous} lên Ver ${VERSION}.`:`Phần mềm đang sử dụng Ver ${VERSION}.`;
  notifications.show(detail,'Quản Lý Lát Yên',false,'✅');
  rememberVersion();
  state.updateNoticeShown=true;
  return true;
}
function boot(){
  mountBadge();
  if(!showUpdateNotice())setTimeout(showUpdateNotice,600);
}
window.__LY_APP_VERSION=VERSION;
window.__LY_APP_VERSION_LABEL=LABEL;
window.__lyAppVersion={version:VERSION,label:LABEL,mount:mountBadge,status:()=>({...state})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(mountBadge,500);
})();
