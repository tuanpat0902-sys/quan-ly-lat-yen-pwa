(()=>{
'use strict';
if(window.__lyAppVersion)return;
const VERSION='2.0.3';
const LABEL=`Ver ${VERSION}`;
const DEFAULT_NAME='QUẢN LÝ LÁT YÊN';
const STORAGE_KEY='lat_yen_last_seen_app_version';
const state={version:VERSION,label:LABEL,badgeMounted:false,updateNoticeShown:false,targetMode:''};
const text=v=>String(v??'').trim();
const stripVersion=v=>text(v).replace(/\s*(?:·|-)\s*Ver\s+\d+\.\d+\.\d+\s*$/i,'').trim();

function brandNameCandidates(){
  const names=new Set([DEFAULT_NAME.toLowerCase()]);
  try{const live=stripVersion(window.__lyBrandingSync?.status?.().softwareName);if(live)names.add(live.toLowerCase());}catch(e){}
  return names;
}
function findBrandTextTarget(){
  const names=brandNameCandidates();
  const roots=[document.querySelector('header'),document.getElementById('nav'),document.querySelector('aside'),document.querySelector('.sidebar'),document.body].filter(Boolean);
  for(const root of roots){
    const nodes=[...root.querySelectorAll('span,div,strong,b,h1,h2,h3,p')];
    const exact=nodes.find(el=>!el.children.length&&names.has(stripVersion(el.textContent).toLowerCase()));
    if(exact){state.targetMode=root===document.body?'body-text':'sidebar-text';return exact;}
  }
  state.targetMode='none';return null;
}
function mountBadge(){
  const target=findBrandTextTarget();
  if(!target)return false;
  const base=stripVersion(target.textContent)||DEFAULT_NAME;
  const wanted=`${base} · ${LABEL}`;
  if(text(target.textContent)!==wanted)target.textContent=wanted;
  document.getElementById('lyAppVersionBadge')?.remove();
  target.setAttribute('data-ly-app-version',VERSION);
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
[50,250,800,1800,3500,6000].forEach(ms=>setTimeout(mountBadge,ms));
window.addEventListener('focus',mountBadge);
window.addEventListener('latyen:branding-updated',()=>setTimeout(mountBadge,0));
})();
