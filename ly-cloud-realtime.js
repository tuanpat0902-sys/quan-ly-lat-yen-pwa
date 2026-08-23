(()=>{
  'use strict';
  if(window.__lyUnifiedCloudRealtimeV2)return;
  window.__lyUnifiedCloudRealtimeV2=true;

  const VERSION='2026.08.23.2';
  let observer=null;
  let timer=null;
  let scheduled=false;

  const text=v=>String(v??'').trim();

  function injectStyles(){
    if(document.getElementById('lyUnifiedCloudRealtimeStyles'))document.getElementById('lyUnifiedCloudRealtimeStyles').remove();
    const style=document.createElement('style');
    style.id='lyUnifiedCloudRealtimeStyles';
    style.textContent=`
      [data-ly-merged-realtime="1"]{display:none!important}
      /* Legacy used ::before to draw a second cloud. Kill every legacy pseudo-icon. */
      #cloudStatus::before,#cloudStatus::after,
      #cloudStatus.cloud::before,#cloudStatus.cloud::after,
      #cloudStatus.cloud-icon::before,#cloudStatus.cloud-icon::after{
        content:none!important;display:none!important;width:0!important;height:0!important;
      }
      #cloudStatus.ly-cloud-unified{width:36px!important;min-width:36px!important;max-width:36px!important;height:34px!important;min-height:34px!important;padding:0!important;display:inline-grid!important;place-items:center!important;overflow:visible!important;position:relative!important;border-radius:9px!important;font-size:0!important;line-height:0!important}
      #cloudStatus.ly-cloud-unified>.ly-cloud-unified-body{position:relative;width:25px;height:24px;display:grid;place-items:center;margin:0!important;padding:0!important}
      #cloudStatus.ly-cloud-unified>.ly-cloud-unified-body>.ly-cloud-main{width:22px!important;height:22px!important;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;display:block!important;margin:0!important}
      #cloudStatus.ly-cloud-unified .ly-cloud-ring{position:absolute;inset:-1px;border:2px solid transparent;border-top-color:currentColor;border-right-color:currentColor;border-radius:50%;opacity:0;pointer-events:none}
      #cloudStatus.ly-cloud-unified.ly-syncing .ly-cloud-ring{opacity:.7;animation:lyUnifiedCloudSpin .82s linear infinite}
      #cloudStatus.ly-cloud-unified.ly-synced>.ly-cloud-unified-body{animation:lyUnifiedCloudPulse .4s ease}
      #cloudStatus.ly-cloud-unified.ly-pending{color:#b54708!important;background:#fffaeb!important;border-color:#fedf89!important}
      #cloudStatus.ly-cloud-unified.ly-offline{color:#b42318!important;background:#fef3f2!important;border-color:#fecdca!important}
      #cloudStatus.ly-cloud-unified.ly-realtime-live{color:#087f6f!important;background:#ecfdf5!important;border-color:#a7f3d0!important}
      #cloudStatus.ly-cloud-unified .ly-rt-signal{position:absolute;right:-4px;top:-3px;width:12px;height:12px;display:none;pointer-events:none}
      #cloudStatus.ly-cloud-unified.ly-realtime-live .ly-rt-signal{display:block}
      #cloudStatus.ly-cloud-unified .ly-rt-dot{position:absolute;right:0;bottom:0;width:4px;height:4px;border-radius:50%;background:currentColor}
      #cloudStatus.ly-cloud-unified .ly-rt-wave1,#cloudStatus.ly-cloud-unified .ly-rt-wave2{position:absolute;right:1px;bottom:1px;border:1.5px solid currentColor;border-left-color:transparent;border-bottom-color:transparent;border-radius:100% 0 0 0;transform:rotate(-45deg);transform-origin:100% 100%;opacity:.7}
      #cloudStatus.ly-cloud-unified .ly-rt-wave1{width:7px;height:7px;animation:lyRealtimeWave 1.45s ease-out infinite}
      #cloudStatus.ly-cloud-unified .ly-rt-wave2{width:11px;height:11px;animation:lyRealtimeWave 1.45s .28s ease-out infinite}
      #cloudStatus.ly-cloud-unified.ly-smart-sync .ly-smart-dot{display:block}
      #cloudStatus.ly-cloud-unified .ly-smart-dot{display:none;position:absolute;right:-3px;top:-3px;width:7px;height:7px;border:2px solid #fff;border-radius:50%;background:#f79009;box-shadow:0 0 0 1px rgba(181,71,8,.18)}
      @keyframes lyUnifiedCloudSpin{to{transform:rotate(360deg)}}
      @keyframes lyUnifiedCloudPulse{0%{transform:scale(.9)}60%{transform:scale(1.08)}100%{transform:scale(1)}}
      @keyframes lyRealtimeWave{0%{opacity:.15;transform:rotate(-45deg) scale(.7)}45%{opacity:.9}100%{opacity:0;transform:rotate(-45deg) scale(1.08)}}
      @media(prefers-reduced-motion:reduce){#cloudStatus.ly-cloud-unified *{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function hideSeparateRealtimeIndicators(){
    const cloud=document.getElementById('cloudStatus');
    const root=document.querySelector('.top-actions')||document.querySelector('header');
    if(!root)return;
    root.querySelectorAll('*').forEach(el=>{
      if(el===cloud||el.id==='lyNotificationButton'||el.id==='warehouseSelect'||el.closest?.('#lyNotificationButton'))return;
      if(el.closest?.('#cloudStatus'))return;
      const idClass=`${el.id||''} ${typeof el.className==='string'?el.className:''}`.toLowerCase();
      const label=`${el.getAttribute?.('title')||''} ${el.getAttribute?.('aria-label')||''} ${el.childElementCount===0?(el.textContent||''):''}`.trim().toLowerCase();
      const byName=/realtime|real-time/.test(idClass);
      const byLabel=/^(realtime|real-time|realtime online|realtime connected|realtime • online)$/i.test(label);
      if(byName||byLabel)el.setAttribute('data-ly-merged-realtime','1');
    });
  }

  function inferState(el){
    const raw=text(el.title||el.getAttribute('aria-label')||el.textContent);
    const lower=raw.toLowerCase();
    let mode='synced';
    if(/gián đoạn|offline|mất kết nối|tạm dừng|lỗi/.test(lower))mode='offline';
    else if(/chờ|pending|còn\s+\d+\s+mục/.test(lower))mode='pending';
    else if(/đang|đồng bộ|syncing|đang tải|đang gửi|gửi thay đổi/.test(lower))mode='syncing';
    const realtime=/realtime|real-time/.test(lower)&&mode!=='offline';
    const smartSync=/smart\s*sync/.test(lower)&&!realtime&&mode!=='offline';
    return {mode,realtime,smartSync,raw};
  }

  function statusTitle(state){
    if(state.mode==='offline')return 'Cloud + Realtime • Mất kết nối';
    if(state.mode==='pending')return state.smartSync?'Cloud + Smart Sync • Có dữ liệu đang chờ':'Cloud • Có dữ liệu đang chờ đồng bộ';
    if(state.mode==='syncing')return state.realtime?'Cloud + Realtime • Đang đồng bộ':'Cloud • Đang đồng bộ';
    if(state.realtime)return 'Cloud + Realtime • Đã kết nối';
    if(state.smartSync)return 'Cloud • Smart Sync dự phòng';
    return state.raw||'Cloud • Đã kết nối';
  }

  function render(){
    scheduled=false;
    injectStyles();
    hideSeparateRealtimeIndicators();
    const el=document.getElementById('cloudStatus');
    if(!el)return;
    const state=inferState(el);
    const key=`${state.mode}:${state.realtime?1:0}:${state.smartSync?1:0}:${state.raw}`;

    /* Legacy setCloudStatus() re-adds cloud-icon and its own SVG. Strip both every pass. */
    el.classList.remove('cloud-icon');
    el.classList.add('ly-cloud-unified','ly-cloud-dynamic');
    el.classList.remove('ly-syncing','ly-synced','ly-pending','ly-offline','ly-realtime-live','ly-smart-sync');
    el.classList.add(state.mode==='syncing'?'ly-syncing':state.mode==='pending'?'ly-pending':state.mode==='offline'?'ly-offline':'ly-synced');
    if(state.realtime)el.classList.add('ly-realtime-live');
    if(state.smartSync)el.classList.add('ly-smart-sync');

    const alreadySingle=el.children.length===1&&el.firstElementChild?.classList.contains('ly-cloud-unified-body');
    if(el.dataset.lyUnifiedKey!==key||!alreadySingle){
      el.dataset.lyUnifiedKey=key;
      const mark=state.mode==='offline'?'<path d="M8.5 9.5l7 7"></path>':state.mode==='pending'?'<path d="M12 10v3l2 1"></path>':state.mode==='syncing'?'<path d="M12 9v6"></path>':'<path d="m9.5 13 1.6 1.6 3.5-3.6"></path>';
      el.innerHTML=`<span class="ly-cloud-unified-body"><span class="ly-cloud-ring"></span><svg class="ly-cloud-main" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 6.7 8.4 4.5 4.5 0 0 0 7 18Z"></path>${mark}</svg><span class="ly-rt-signal" aria-hidden="true"><span class="ly-rt-dot"></span><span class="ly-rt-wave1"></span><span class="ly-rt-wave2"></span></span><span class="ly-smart-dot" aria-hidden="true"></span></span>`;
    }
    const title=statusTitle(state);
    el.title=title;
    el.setAttribute('aria-label',title);
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(render);
  }

  function start(){
    injectStyles();
    schedule();
    const root=document.querySelector('.top-actions')||document.querySelector('header')||document.body;
    observer?.disconnect();
    observer=new MutationObserver(schedule);
    observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','title','aria-label','id']});
    clearInterval(timer);
    timer=setInterval(schedule,700);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.__lyUnifiedCloudRealtime={version:VERSION,refresh:schedule,status:()=>{const el=document.getElementById('cloudStatus');return el?inferState(el):null;}};
})();
