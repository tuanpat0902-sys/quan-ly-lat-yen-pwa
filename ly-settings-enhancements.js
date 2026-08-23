(()=>{
  'use strict';
  if(window.__lySettingsEnhancementsV2)return;
  window.__lySettingsEnhancementsV2=true;

  const VERSION='2026.08.23.2';
  const MASTER_KEY='lat_yen_notifications_master_v1';
  const LEGACY_PREF_KEY='lat_yen_notify_pref_v226';
  let originalShowNotification=null;
  let reconcileTimer=null;

  const text=v=>String(v??'').trim();
  const enabled=()=>{try{return localStorage.getItem(MASTER_KEY)!=='0';}catch(e){return true;}};
  const setText=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value;};
  const toggleClass=(el,name,on)=>{if(el&&el.classList.contains(name)!==!!on)el.classList.toggle(name,!!on);};
  const setDisabled=(el,on)=>{if(el&&el.disabled!==!!on)el.disabled=!!on;};

  function saveLegacyEnabled(value){
    try{
      const pref=JSON.parse(localStorage.getItem(LEGACY_PREF_KEY)||'{}');
      pref.enabled=!!value;
      localStorage.setItem(LEGACY_PREF_KEY,JSON.stringify(pref));
    }catch(e){}
  }

  function setMaster(value){
    const on=!!value;
    try{localStorage.setItem(MASTER_KEY,on?'1':'0');}catch(e){}
    saveLegacyEnabled(on);
    document.documentElement.dataset.lyNotificationsMaster=on?'on':'off';
    try{window.__lyDataActivityNotifications?.setEnabled?.(on);}catch(e){}
    try{window.dispatchEvent(new CustomEvent('latyen:notification-master',{detail:{enabled:on}}));}catch(e){}
    reconcile();
  }

  function patchNativeNotifications(){
    try{
      const proto=window.ServiceWorkerRegistration?.prototype;
      if(!proto||proto.__lyMasterPatchedV2)return;
      originalShowNotification=proto.showNotification;
      if(typeof originalShowNotification!=='function')return;
      proto.showNotification=function(title,options){
        if(!enabled())return Promise.resolve();
        return originalShowNotification.call(this,title,options);
      };
      Object.defineProperty(proto,'__lyMasterPatchedV2',{value:true,configurable:true});
    }catch(e){console.warn('[Lát Yên] notification master patch',e);}
  }

  function injectStyles(){
    if(document.getElementById('lySettingsEnhancementsStylesV2'))return;
    document.getElementById('lySettingsEnhancementsStyles')?.remove();
    const s=document.createElement('style');
    s.id='lySettingsEnhancementsStylesV2';
    s.textContent=`
      .ly-notify-master-btn{border:1px solid #d0d5dd!important;background:#fff!important;color:#344054!important}
      .ly-notify-master-btn.is-off{border-color:#fecaca!important;background:#fff7f7!important;color:#b42318!important}
      .ly-notify-master-hint{margin-top:9px;padding:9px 10px;border-radius:9px;background:#f8fafc;border:1px solid #e4e7ec;color:#667085;font-size:11.5px;line-height:1.4}
      .ly-notify-master-hint.is-off{background:#fff8f7;border-color:#fee4e2;color:#912018}
      .ly-notify-master-disabled{opacity:.55!important}
    `;
    document.head.appendChild(s);
  }

  function findNotificationCard(){
    const root=document.getElementById('settings')||document.querySelector('main')||document.body;
    const candidates=[...root.querySelectorAll('.card,section,article')];
    return candidates.find(el=>/Thông báo Chrome App/i.test(text(el.textContent))&&el.querySelector('button'))||null;
  }

  function buttonByText(card,rx){return [...card.querySelectorAll('button')].find(b=>rx.test(text(b.textContent)));}

  function render(card,btn,hint){
    if(!card||!btn||!hint)return;
    const on=enabled();
    setText(btn,on?'Tắt thông báo':'Bật thông báo');
    toggleClass(btn,'is-off',!on);
    const title=on?'Tạm dừng popup và thông báo hệ thống':'Bật lại popup và thông báo hệ thống';
    if(btn.title!==title)btn.title=title;
    toggleClass(hint,'is-off',!on);
    setText(hint,on?'Thông báo ứng dụng đang bật. Có thể tắt tạm thời mà không mất lịch sử ở biểu tượng chuông.':'Thông báo ứng dụng đang tắt. Lịch sử hoạt động và số chưa đọc vẫn tiếp tục được lưu ở biểu tượng chuông.');
    card.querySelectorAll('input[type="checkbox"]').forEach(el=>{
      setDisabled(el,!on);
      const wrap=el.closest('label,div');
      if(wrap)toggleClass(wrap,'ly-notify-master-disabled',!on);
    });
    const test=buttonByText(card,/Gửi thử/i);
    if(test){setDisabled(test,!on);toggleClass(test,'ly-notify-master-disabled',!on);}
  }

  function reconcile(){
    injectStyles();patchNativeNotifications();
    document.documentElement.dataset.lyNotificationsMaster=enabled()?'on':'off';
    const card=findNotificationCard();
    if(!card)return false;
    let btn=document.getElementById('lyNotificationMasterToggle');
    if(!btn||!card.contains(btn)){
      btn=document.createElement('button');
      btn.id='lyNotificationMasterToggle';
      btn.type='button';
      btn.className='ly-notify-master-btn';
      const test=buttonByText(card,/Gửi thử/i),primary=buttonByText(card,/bật thông báo|đã bật thông báo/i);
      if(test?.parentNode)test.parentNode.insertBefore(btn,test);
      else if(primary?.parentNode)primary.parentNode.appendChild(btn);
      else card.appendChild(btn);
      btn.addEventListener('click',async()=>{
        const next=!enabled();setMaster(next);
        if(next&&'Notification' in window&&Notification.permission!=='granted'){
          try{await window.__lyDataActivityNotifications?.requestPermission?.();}catch(e){}
        }
      });
    }
    let hint=document.getElementById('lyNotifyMasterHint');
    if(!hint||!card.contains(hint)){
      hint=document.createElement('div');hint.id='lyNotifyMasterHint';hint.className='ly-notify-master-hint';card.appendChild(hint);
    }
    render(card,btn,hint);return true;
  }

  function reconcileSoon(){
    clearTimeout(reconcileTimer);reconcileTimer=setTimeout(reconcile,120);setTimeout(reconcile,500);
  }

  function isSettingsClick(target){
    const btn=target?.closest?.('#nav button[data-panel],button[data-panel]');if(!btn)return false;
    const id=text(btn.dataset.panel).toLowerCase(),label=text(btn.textContent).toLowerCase();
    return id==='settings'||label.includes('cài đặt');
  }

  function start(){
    patchNativeNotifications();reconcile();
    document.addEventListener('click',e=>{if(isSettingsClick(e.target))reconcileSoon();},true);
    window.addEventListener('focus',()=>{if(findNotificationCard())reconcile();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&findNotificationCard())reconcile();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.__lyNotificationMaster={version:VERSION,isEnabled:enabled,setEnabled:setMaster,refresh:reconcile};
})();
