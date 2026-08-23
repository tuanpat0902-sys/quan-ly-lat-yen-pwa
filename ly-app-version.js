(()=>{
'use strict';
if(window.__lyAppVersion)return;
const VERSION='2.0.2';
const LABEL=`Ver ${VERSION}`;
const DEFAULT_NAME='QUẢN LÝ LÁT YÊN';
const STORAGE_KEY='lat_yen_last_seen_app_version';
const state={version:VERSION,label:LABEL,badgeMounted:false,updateNoticeShown:false,targetMode:''};
const text=v=>String(v??'').trim();

function brandNameCandidates(){
  const names=new Set([DEFAULT_NAME.toLowerCase()]);
  try{const live=text(window.__lyBrandingSync?.status?.().softwareName);if(live)names.add(live.toLowerCase());}catch(e){}
  return names;
}
function findBrandTarget(){
  const direct=document.querySelector('.brand,[data-app-brand],[data-software-name],#appBrand,#app-brand');
  if(direct){state.targetMode='direct';return direct;}
  const names=brandNameCandidates();
  const roots=[document.querySelector('header'),document.getElementById('nav'),document.querySelector('aside'),document.querySelector('.sidebar')].filter(Boolean);
  for(const root of roots){
    const nodes=[...root.querySelectorAll('span,div,strong,b,h1,h2,h3,p')];
    const exact=nodes.find(el=>!el.children.length&&names.has(text(el.textContent).toLowerCase()));
    if(exact){state.targetMode='text';return exact;}
  }
  const all=[...document.querySelectorAll('header span,header div,header strong,header h1,header h2,aside span,aside div,.sidebar span,.sidebar div')];
  const fuzzy=all.find(el=>!el.children.length&&/QUẢN\s*LÝ\s*LÁT\s*YÊN/i.test(text(el.textContent)));
  if(fuzzy){state.targetMode='fuzzy';return fuzzy;}
  state.targetMode='none';return null;
}
function mountBadge(){
  const target=findBrandTarget();
  if(!target)return false;
  let badge=document.getElementById('lyAppVersionBadge');
  if(!badge){
    badge=document.createElement('span');badge.id='lyAppVersionBadge';badge.title=`Phiên bản phần mềm ${VERSION}`;
    badge.style.cssText='display:inline-flex;align-items:center;margin-left:7px;padding:2px 6px;border-radius:999px;background:#eef4f3;color:#667085;border:1px solid #dbe7e5;font-size:10px;font-weight:750;line-height:1.35;vertical-align:middle;white-space:nowrap;letter-spacing:.01em';
  }
  badge.textContent=LABEL;
  if(badge.previousElementSibling!==target){
    try{target.style.display='inline-block';target.insertAdjacentElement('afterend',badge);}catch(e){target.parentNode?.insertBefore(badge,target.nextSibling);}
  }
  state.badgeMounted=true;return true;
}
function previousVersion(){try{return localStorage.getItem(STORAGE_KEY)||'';}catch(e){return '';}}
function rememberVersion(){try{localStorage.setItem(STORAGE_KEY,VERSION);}catch(e){}}
function showUpdateNotice(){
  if(state.updateNoticeShown)return true;const previous=previousVersion();if(previous===VERSION)return true;
  const notifications=window.__lyInAppNotifications;if(typeof notifications?.show!=='function')return false;
  const detail=previous?`Đã cập nhật phần mềm từ Ver ${previous} lên Ver ${VERSION}.`:`Phần mềm đang sử dụng Ver ${VERSION}.`;
  notifications.show(detail,'Quản Lý Lát Yên',false,'✅');rememberVersion();state.updateNoticeShown=true;return true;
}
function boot(){mountBadge();if(!showUpdateNotice())setTimeout(showUpdateNotice,600);}
window.__LY_APP_VERSION=VERSION;window.__LY_APP_VERSION_LABEL=LABEL;
window.__lyAppVersion={version:VERSION,label:LABEL,mount:mountBadge,status:()=>({...state})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
[250,800,1800,3500].forEach(ms=>setTimeout(mountBadge,ms));
window.addEventListener('focus',mountBadge);
window.addEventListener('latyen:branding-updated',()=>setTimeout(mountBadge,0));
})();
