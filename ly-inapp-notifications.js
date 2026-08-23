(()=>{
  'use strict';
  if(window.__lyInAppNotificationsV3)return;
  window.__lyInAppNotificationsV3=true;
  const VERSION='2026.08.23.3';

  function host(){
    let el=document.getElementById('lyInAppNotificationHost');if(el)return el;
    el=document.createElement('div');el.id='lyInAppNotificationHost';el.setAttribute('aria-live','polite');
    el.style.cssText='position:fixed;top:14px;right:14px;z-index:2147483646;width:min(390px,calc(100vw - 28px));display:flex;flex-direction:column;gap:10px;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';document.body.appendChild(el);return el;
  }
  function showToast(body,title='Quản Lý Lát Yên',persistent=false,emoji='🔔'){
    if(!document.body||document.hidden)return;
    const root=host();while(root.children.length>=3)root.firstElementChild?.remove();
    const card=document.createElement('div');card.style.cssText='pointer-events:auto;background:#101828;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:13px 14px;box-shadow:0 16px 45px rgba(0,0,0,.30);display:grid;grid-template-columns:34px 1fr 26px;gap:10px;align-items:start;opacity:0;transform:translateY(-8px);transition:opacity .18s ease,transform .18s ease';
    const icon=document.createElement('div');icon.textContent=emoji;icon.style.cssText='width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.10);display:grid;place-items:center;font-size:18px';
    const content=document.createElement('div');const h=document.createElement('div');h.textContent=title;h.style.cssText='font-size:13px;font-weight:800;margin-bottom:3px';const b=document.createElement('div');b.textContent=body;b.style.cssText='font-size:13px;line-height:1.42;color:#f2f4f7';const t=document.createElement('div');t.textContent=new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});t.style.cssText='font-size:11px;color:#98a2b3;margin-top:5px';content.append(h,b,t);
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Đóng');close.style.cssText='border:0;background:transparent;color:#d0d5dd;font-size:22px;line-height:22px;cursor:pointer;padding:0';close.onclick=()=>card.remove();card.append(icon,content,close);root.appendChild(card);
    requestAnimationFrame(()=>{card.style.opacity='1';card.style.transform='translateY(0)';});if(!persistent)setTimeout(()=>{card.style.opacity='0';card.style.transform='translateY(-6px)';setTimeout(()=>card.remove(),220);},7200);
  }

  window.addEventListener('latyen:activity',event=>{
    const item=event?.detail||{};
    if(document.hidden||!item.popup||item.local)return;
    showToast(item.body,item.title,false,item.icon||'🔔');
  });
  window.__lyInAppNotifications={version:VERSION,show:showToast,status:()=>({version:VERSION})};
})();
