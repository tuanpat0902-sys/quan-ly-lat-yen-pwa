(()=>{
  'use strict';
  if(window.__lySettingsEnhancementsV2)return;
  window.__lySettingsEnhancementsV2=true;

  const VERSION='2026.08.24.4';
  const MASTER_KEY='lat_yen_notifications_master_v1';
  const LEGACY_PREF_KEY='lat_yen_notify_pref_v226';
  const PAGE_LOADED_AT=new Date();
  let originalShowNotification=null;
  let reconcileTimer=null;

  const text=v=>String(v??'').trim();
  const enabled=()=>{try{return localStorage.getItem(MASTER_KEY)!=='0';}catch(e){return true;}};
  const setText=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value;};
  const toggleClass=(el,name,on)=>{if(el&&el.classList.contains(name)!==!!on)el.classList.toggle(name,!!on);};
  const setDisabled=(el,on)=>{if(el&&el.disabled!==!!on)el.disabled=!!on;};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

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
      .ly-version-card{margin-top:12px;padding:13px 15px!important}
      .ly-version-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .ly-version-head h3{margin:0 0 3px!important}
      .ly-version-state{font-size:11px;font-weight:750;color:#067647;background:#ecfdf3;border-radius:999px;padding:4px 8px;white-space:nowrap}
      .ly-version-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .ly-version-summary span{padding:5px 8px;border:1px solid #e4e7ec;border-radius:8px;background:#f8fafc;font-size:11.5px;color:#475467}
      .ly-version-details{margin-top:10px;border-top:1px solid #eef2f6;padding-top:8px}
      .ly-version-details summary{cursor:pointer;color:#475467;font-size:12px;font-weight:750}
      .ly-version-table{width:100%;border-collapse:collapse;margin-top:7px}
      .ly-version-table td{padding:6px 8px;border-bottom:1px solid #eef2f6;vertical-align:top;font-size:11.5px}
      .ly-version-table td:first-child{width:150px;color:#667085;font-weight:700}
      .ly-version-value{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;word-break:break-word}
      .ly-version-primary{font-size:17px;font-weight:850;color:#0f766e}
      @media(max-width:650px){.ly-version-table td:first-child{width:120px}.ly-version-table td{font-size:12px;padding:8px 6px}}
    `;
    document.head.appendChild(s);
  }

  function findNotificationCard(){
    const root=document.getElementById('settings')||document.querySelector('main')||document.body;
    const candidates=[...root.querySelectorAll('.card,section,article')];
    return candidates.find(el=>/Thông báo Chrome App/i.test(text(el.textContent))&&el.querySelector('button'))||null;
  }

  function buttonByText(card,rx){return [...card.querySelectorAll('button')].find(b=>rx.test(text(b.textContent)));}

  function versionSnapshot(){
    const app=window.__lyAppVersion||{};
    const core=window.__lyFreshCoreV2||{};
    const loader=window.__lyModuleLoader||{};
    const finalOwnership=window.__lyFreshCoreV2FinalOwnership||{};
    const sw=navigator.serviceWorker?.controller;
    return {
      appLabel:app.label||window.__LY_APP_VERSION_LABEL||'Không xác định',
      appVersion:app.version||window.__LY_APP_VERSION||'Không xác định',
      revision:app.revision||'Không xác định',
      coreVersion:core.version||core?.status?.()?.version||'Fresh Core V2',
      ownershipVersion:finalOwnership.version||'Không xác định',
      moduleLoaderVersion:loader.version||loader?.status?.()?.version||'Không xác định',
      settingsModuleVersion:VERSION,
      serviceWorker:sw?.scriptURL||'Chưa có controller',
      loadedAt:PAGE_LOADED_AT.toLocaleString('vi-VN'),
      pageUrl:location.href
    };
  }

  function ensureVersionCard(){
    const root=document.getElementById('settings');
    if(!root)return false;
    let card=document.getElementById('lyVersionInfoCard');
    if(!card){
      card=document.createElement('div');
      card.id='lyVersionInfoCard';
      card.className='card ly-version-card';
      root.appendChild(card);
    }
    const v=versionSnapshot();
    card.innerHTML=`
      <div class="ly-version-head">
        <div><h3>Phiên bản phần mềm</h3><div class="ly-version-primary">${esc(v.appLabel)}</div></div>
        <span class="ly-version-state">Đang hoạt động</span>
      </div>
      <div class="ly-version-summary"><span>Revision: <b>${esc(v.revision)}</b></span><span>Tải lúc: <b>${esc(v.loadedAt)}</b></span></div>
      <details class="ly-version-details">
        <summary>Xem chi tiết kỹ thuật</summary>
        <table class="ly-version-table"><tbody>
          <tr><td>Fresh Core</td><td class="ly-version-value">${esc(v.coreVersion)}</td></tr>
          <tr><td>Quyền ghi dữ liệu</td><td class="ly-version-value">${esc(v.ownershipVersion)}</td></tr>
          <tr><td>Module loader</td><td class="ly-version-value">${esc(v.moduleLoaderVersion)}</td></tr>
          <tr><td>Service Worker</td><td class="ly-version-value">${esc(v.serviceWorker)}</td></tr>
          <tr><td>URL</td><td class="ly-version-value">${esc(v.pageUrl)}</td></tr>
        </tbody></table>
      </details>`;
    return true;
  }

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
    injectStyles();patchNativeNotifications();ensureVersionCard();
    document.documentElement.dataset.lyNotificationsMaster=enabled()?'on':'off';
    const card=findNotificationCard();
    if(!card)return !!document.getElementById('lyVersionInfoCard');
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
    window.addEventListener('focus',()=>{if(document.getElementById('settings'))reconcile();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.getElementById('settings'))reconcile();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.__lyNotificationMaster={version:VERSION,isEnabled:enabled,setEnabled:setMaster,refresh:reconcile};
})();
