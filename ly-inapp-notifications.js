(()=>{
  'use strict';
  if(window.__lyInAppNotificationsV7)return;
  window.__lyInAppNotificationsV7=true;
  const VERSION='2026.08.27.4';
  const MASTER_KEY='lat_yen_notifications_master_v1';
  const activityEnabled=()=>{try{return localStorage.getItem(MASTER_KEY)!=='0';}catch(e){return true;}};
  const isDesktopActive=()=>{try{return !document.hidden&&matchMedia('(hover:hover) and (pointer:fine)').matches&&window.innerWidth>=768;}catch(e){return false;}};
  const appVersionLabel=()=>window.__LY_APP_VERSION_LABEL||`Ver ${window.__LY_APP_VERSION||'2.0.3'}`;
  const titleWithVersion=title=>{const value=String(title||'Quản Lý Lát Yên');const ver=appVersionLabel();return value.includes(ver)?value:`${value} · ${ver}`;};
  function requestAppVersion(){
    if(window.__lyAppVersion)return;
    try{if(typeof document==='undefined'||!document.createElement)return;const script=document.createElement('script');script.src='./ly-app-version.js?v=3.0.12';script.async=false;(document.head||document.documentElement||document.body)?.appendChild(script);}catch(e){}
  }
  function host(){let el=document.getElementById('lyInAppNotificationHost');if(el)return el;el=document.createElement('div');el.id='lyInAppNotificationHost';el.setAttribute('aria-live','polite');el.style.cssText='position:fixed;top:14px;right:14px;z-index:2147483646;width:min(405px,calc(100vw - 28px));display:flex;flex-direction:column;gap:10px;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';document.body.appendChild(el);return el;}
  function showToast(body,title='Quản Lý Lát Yên',persistent=false,emoji='🔔'){
    if(!document.body||document.hidden)return;const root=host();while(root.children.length>=3)root.firstElementChild?.remove();
    const card=document.createElement('div');card.style.cssText='pointer-events:auto;background:linear-gradient(145deg,#ffffff,#f7fbfa);color:#17202a;border:1px solid #d7e8e5;border-left:4px solid #0f766e;border-radius:14px;padding:13px 14px 13px 12px;box-shadow:0 14px 36px rgba(16,24,40,.14);display:grid;grid-template-columns:36px 1fr 26px;gap:10px;align-items:start;opacity:0;transform:translateY(-8px);transition:opacity .18s ease,transform .18s ease';
    const icon=document.createElement('div');icon.textContent=emoji;icon.style.cssText='width:36px;height:36px;border-radius:11px;background:#eaf8f5;color:#087f6f;display:grid;place-items:center;font-size:18px;border:1px solid #ccece6';
    const content=document.createElement('div');const h=document.createElement('div');h.textContent=titleWithVersion(title);h.style.cssText='font-size:13.5px;font-weight:850;margin-bottom:3px;color:#1d2939';const b=document.createElement('div');b.textContent=body;b.style.cssText='font-size:13px;line-height:1.42;color:#475467';const t=document.createElement('div');t.textContent=`${new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} · ${appVersionLabel()}`;t.style.cssText='font-size:11px;color:#98a2b3;margin-top:5px';content.append(h,b,t);
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Đóng');close.style.cssText='border:0;background:transparent;color:#667085;font-size:22px;line-height:22px;cursor:pointer;padding:0;border-radius:7px';close.onclick=()=>card.remove();card.append(icon,content,close);root.appendChild(card);
    requestAnimationFrame(()=>{card.style.opacity='1';card.style.transform='translateY(0)';});if(!persistent)setTimeout(()=>{card.style.opacity='0';card.style.transform='translateY(-6px)';setTimeout(()=>card.remove(),220);},7200);
  }
  window.addEventListener('latyen:activity',event=>{const item=event?.detail||{};if(!activityEnabled()||document.hidden||isDesktopActive()||!item.popup||item.local)return;showToast(item.body,item.title,false,item.icon||'🔔');});
  window.__lyInAppNotifications={version:VERSION,show:showToast,status:()=>({version:VERSION,appVersion:window.__LY_APP_VERSION||'2.0.3',activityEnabled:activityEnabled(),desktopActiveSuppressed:isDesktopActive()})};requestAppVersion();
})();
