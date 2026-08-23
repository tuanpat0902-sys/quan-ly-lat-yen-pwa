(()=>{
  'use strict';
  if(window.__lySettingsEnhancementsV1)return;
  window.__lySettingsEnhancementsV1=true;

  const VERSION='2026.08.23.1';
  const MASTER_KEY='lat_yen_notifications_master_v1';
  const LEGACY_PREF_KEY='lat_yen_notify_pref_v226';
  let timer=null,observer=null,originalShowNotification=null;
  const text=v=>String(v??'').trim();
  const enabled=()=>{try{return localStorage.getItem(MASTER_KEY)!=='0';}catch(e){return true;}};

  function saveLegacyEnabled(value){
    try{const pref=JSON.parse(localStorage.getItem(LEGACY_PREF_KEY)||'{}');pref.enabled=!!value;localStorage.setItem(LEGACY_PREF_KEY,JSON.stringify(pref));}catch(e){}
  }
  function setMaster(value){
    try{localStorage.setItem(MASTER_KEY,value?'1':'0');}catch(e){}
    saveLegacyEnabled(value);
    document.documentElement.dataset.lyNotificationsMaster=value?'on':'off';
    try{window.__lyDataActivityNotifications?.setEnabled?.(value);}catch(e){}
    window.dispatchEvent(new CustomEvent('latyen:notification-master',{detail:{enabled:value}}));
    renderToggle();
  }

  function patchNativeNotifications(){
    try{
      const proto=window.ServiceWorkerRegistration?.prototype;
      if(!proto||proto.__lyMasterPatched)return;
      originalShowNotification=proto.showNotification;
      if(typeof originalShowNotification!=='function')return;
      proto.showNotification=function(title,options){
        if(!enabled())return Promise.resolve();
        return originalShowNotification.call(this,title,options);
      };
      Object.defineProperty(proto,'__lyMasterPatched',{value:true,configurable:true});
    }catch(e){console.warn('[Lát Yên] notification master patch',e);}
  }

  function injectStyles(){
    if(document.getElementById('lySettingsEnhancementsStyles'))return;
    const s=document.createElement('style');s.id='lySettingsEnhancementsStyles';s.textContent=`
      .ly-notify-master-btn{border:1px solid #d0d5dd!important;background:#fff!important;color:#344054!important}
      .ly-notify-master-btn.is-off{border-color:#fecaca!important;background:#fff7f7!important;color:#b42318!important}
      .ly-notify-master-hint{margin-top:9px;padding:9px 10px;border-radius:9px;background:#f8fafc;border:1px solid #e4e7ec;color:#667085;font-size:11.5px;line-height:1.4}
      .ly-notify-master-hint.is-off{background:#fff8f7;border-color:#fee4e2;color:#912018}
      .ly-notify-master-disabled{opacity:.55!important}
    `;document.head.appendChild(s);
  }

  function findNotificationCard(){
    const candidates=[...document.querySelectorAll('.card,section,article,div')];
    return candidates.find(el=>{
      if(el.id==='lyNotifyMasterHint')return false;
      const own=[...el.children].slice(0,5).map(x=>text(x.textContent)).join(' ');
      return /Thông báo Chrome App/i.test(own)&&el.querySelector('button');
    })||null;
  }
  function buttonByText(card,rx){return [...card.querySelectorAll('button')].find(b=>rx.test(text(b.textContent)));}

  function ensureToggle(){
    injectStyles();patchNativeNotifications();document.documentElement.dataset.lyNotificationsMaster=enabled()?'on':'off';
    const card=findNotificationCard();if(!card)return;
    let btn=document.getElementById('lyNotificationMasterToggle');
    if(!btn){
      btn=document.createElement('button');btn.id='lyNotificationMasterToggle';btn.type='button';btn.className='ly-notify-master-btn';
      const test=buttonByText(card,/Gửi thử/i),primary=buttonByText(card,/bật thông báo|đã bật thông báo/i);
      if(test?.parentNode)test.parentNode.insertBefore(btn,test);else if(primary?.parentNode)primary.parentNode.appendChild(btn);else card.appendChild(btn);
      btn.addEventListener('click',async()=>{
        const next=!enabled();setMaster(next);
        if(next&&'Notification' in window&&Notification.permission!=='granted'){
          try{await window.__lyDataActivityNotifications?.requestPermission?.();}catch(e){}
        }
      });
    }
    let hint=document.getElementById('lyNotifyMasterHint');
    if(!hint||!card.contains(hint)){hint=document.createElement('div');hint.id='lyNotifyMasterHint';hint.className='ly-notify-master-hint';card.appendChild(hint);}
    renderToggle();
  }

  function renderToggle(){
    const card=findNotificationCard(),btn=document.getElementById('lyNotificationMasterToggle'),hint=document.getElementById('lyNotifyMasterHint');if(!card||!btn||!hint)return;
    const on=enabled();btn.textContent=on?'Tắt thông báo':'Bật thông báo';btn.classList.toggle('is-off',!on);
    btn.title=on?'Tạm dừng popup và thông báo hệ thống':'Bật lại popup và thông báo hệ thống';
    hint.classList.toggle('is-off',!on);hint.textContent=on?'Thông báo ứng dụng đang bật. Có thể tắt tạm thời mà không mất lịch sử ở biểu tượng chuông.':'Thông báo ứng dụng đang tắt. Lịch sử hoạt động và số chưa đọc vẫn tiếp tục được lưu ở biểu tượng chuông.';
    card.querySelectorAll('input[type="checkbox"]').forEach(el=>{el.disabled=!on;el.closest('label,div')?.classList.toggle('ly-notify-master-disabled',!on);});
    const test=buttonByText(card,/Gửi thử/i);if(test){test.disabled=!on;test.classList.toggle('ly-notify-master-disabled',!on);}
  }

  function start(){
    patchNativeNotifications();ensureToggle();
    observer?.disconnect();observer=new MutationObserver(()=>ensureToggle());observer.observe(document.body,{subtree:true,childList:true});
    clearInterval(timer);timer=setInterval(ensureToggle,1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.__lyNotificationMaster={version:VERSION,isEnabled:enabled,setEnabled:setMaster,refresh:ensureToggle};
})();
