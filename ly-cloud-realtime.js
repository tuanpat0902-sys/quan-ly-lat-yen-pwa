(()=>{
  'use strict';
  if(window.__lyUnifiedCloudRealtimeV4)return;
  window.__lyUnifiedCloudRealtimeV4=true;
  const VERSION='2026.08.23.4';
  let observer=null,scheduled=false,lastScanKey='',lastCloud=null;
  const text=v=>String(v??'').trim();

  function injectStyles(){
    if(document.getElementById('lyUnifiedCloudRealtimeStyles'))return;
    const s=document.createElement('style');s.id='lyUnifiedCloudRealtimeStyles';s.textContent=`
      [data-ly-merged-realtime="1"]{display:none!important}
      #cloudStatus::before,#cloudStatus::after,#cloudStatus.cloud::before,#cloudStatus.cloud::after,#cloudStatus.cloud-icon::before,#cloudStatus.cloud-icon::after{content:none!important;display:none!important;width:0!important;height:0!important}
      #cloudStatus.ly-cloud-unified{width:40px!important;min-width:40px!important;max-width:40px!important;height:38px!important;min-height:38px!important;padding:0!important;display:inline-grid!important;place-items:center!important;overflow:visible!important;position:relative!important;border-radius:12px!important;font-size:0!important;line-height:0!important;border:1px solid #b7e4dc!important;background:linear-gradient(145deg,#f6fffd,#eaf8f5)!important;color:#087f6f!important;box-shadow:0 4px 12px rgba(15,118,110,.10)!important;transition:background .2s ease,border-color .2s ease,color .2s ease,box-shadow .2s ease!important}
      #cloudStatus.ly-cloud-unified>.ly-cloud-unified-body{position:relative;width:27px;height:25px;display:grid;place-items:center;margin:0!important;padding:0!important}
      #cloudStatus.ly-cloud-unified .ly-cloud-main{width:25px!important;height:25px!important;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;display:block!important}
      #cloudStatus.ly-cloud-unified .ly-cloud-orbit{position:absolute;inset:-3px;border:1.7px solid transparent;border-top-color:currentColor;border-right-color:currentColor;border-radius:50%;opacity:0;pointer-events:none}
      #cloudStatus.ly-cloud-unified.ly-syncing .ly-cloud-orbit{opacity:.72;animation:lyModernCloudSpin .85s linear infinite}
      #cloudStatus.ly-cloud-unified .ly-live-dot{position:absolute;right:-1px;top:0;width:7px;height:7px;border-radius:50%;background:#12b76a;border:2px solid #fff;box-shadow:0 0 0 0 rgba(18,183,106,.26);display:none}
      #cloudStatus.ly-cloud-unified.ly-realtime-live .ly-live-dot{display:block;animation:lyLivePulse 1.7s ease-out infinite}
      #cloudStatus.ly-cloud-unified.ly-smart-sync .ly-live-dot{display:block;background:#f79009;animation:none}
      #cloudStatus.ly-cloud-unified.ly-pending{color:#b54708!important;background:linear-gradient(145deg,#fffdf5,#fffaeb)!important;border-color:#fedf89!important;box-shadow:0 4px 12px rgba(181,71,8,.08)!important}
      #cloudStatus.ly-cloud-unified.ly-offline{color:#b42318!important;background:linear-gradient(145deg,#fffafa,#fef3f2)!important;border-color:#fecdca!important;box-shadow:none!important}
      #cloudStatus.ly-cloud-unified.ly-synced>.ly-cloud-unified-body{animation:lyModernCloudConfirm .36s ease}
      @keyframes lyModernCloudSpin{to{transform:rotate(360deg)}}@keyframes lyLivePulse{0%{box-shadow:0 0 0 0 rgba(18,183,106,.28)}70%{box-shadow:0 0 0 6px rgba(18,183,106,0)}100%{box-shadow:0 0 0 0 rgba(18,183,106,0)}}@keyframes lyModernCloudConfirm{0%{transform:scale(.94)}65%{transform:scale(1.06)}100%{transform:scale(1)}}
      @media(prefers-reduced-motion:reduce){#cloudStatus.ly-cloud-unified *{animation:none!important}}
    `;document.head.appendChild(s);
  }

  function hideSeparateRealtimeIndicators(root){
    root=root||document.querySelector('.top-actions')||document.querySelector('header');if(!root)return;
    const cloud=document.getElementById('cloudStatus');
    const nodes=[...root.querySelectorAll('[id],[class],[title],[aria-label]')];
    const scanKey=`${nodes.length}:${cloud?.isConnected?1:0}`;if(scanKey===lastScanKey)return;lastScanKey=scanKey;
    for(const el of nodes){
      if(el===cloud||el.id==='lyNotificationButton'||el.id==='warehouseSelect'||el.closest?.('#lyNotificationButton')||el.closest?.('#cloudStatus'))continue;
      const idClass=`${el.id||''} ${typeof el.className==='string'?el.className:''}`.toLowerCase();
      const label=`${el.getAttribute?.('title')||''} ${el.getAttribute?.('aria-label')||''} ${el.childElementCount===0?(el.textContent||''):''}`.trim().toLowerCase();
      if((/realtime|real-time/.test(idClass)||/^(realtime|real-time|realtime online|realtime connected|realtime • online)$/i.test(label))&&el.dataset.lyMergedRealtime!=='1')el.dataset.lyMergedRealtime='1';
    }
  }
  function inferState(el){const raw=text(el.title||el.getAttribute('aria-label')||el.textContent),lower=raw.toLowerCase();let mode='synced';if(/gián đoạn|offline|mất kết nối|tạm dừng|lỗi/.test(lower))mode='offline';else if(/chờ|pending|còn\s+\d+\s+mục/.test(lower))mode='pending';else if(/đang|đồng bộ|syncing|đang tải|đang gửi|gửi thay đổi/.test(lower))mode='syncing';const realtime=/realtime|real-time/.test(lower)&&mode!=='offline',smartSync=/smart\s*sync/.test(lower)&&!realtime&&mode!=='offline';return {mode,realtime,smartSync,raw};}
  function titleFor(x){if(x.mode==='offline')return 'Cloud + Realtime • Mất kết nối';if(x.mode==='pending')return 'Cloud • Có dữ liệu đang chờ đồng bộ';if(x.mode==='syncing')return x.realtime?'Cloud + Realtime • Đang đồng bộ':'Cloud • Đang đồng bộ';if(x.realtime)return 'Cloud + Realtime • Đã kết nối';if(x.smartSync)return 'Cloud • Smart Sync dự phòng';return x.raw||'Cloud • Đã kết nối';}
  function mark(x){if(x.mode==='offline')return '<path d="M8.7 10.2l6.6 6.6"></path>';if(x.mode==='pending')return '<path d="M12 10.5v3l2 1"></path>';if(x.mode==='syncing')return '<path d="M9.5 13.5a3 3 0 0 1 4.9-2.2"></path><path d="M14.7 10.2v2.5h-2.5"></path><path d="M14.5 14a3 3 0 0 1-4.9 2.2"></path><path d="M9.3 17.3v-2.5h2.5"></path>';return '<path d="m9.6 13.4 1.5 1.5 3.4-3.5"></path>';}

  function render(){
    scheduled=false;injectStyles();
    const root=document.querySelector('.top-actions')||document.querySelector('header');hideSeparateRealtimeIndicators(root);
    const el=document.getElementById('cloudStatus');if(!el)return;lastCloud=el;
    const x=inferState(el),key=`${x.mode}:${x.realtime?1:0}:${x.smartSync?1:0}:${x.raw}`;
    if(el.dataset.lyUnifiedKey===key&&el.children.length===1&&el.firstElementChild?.classList.contains('ly-cloud-unified-body'))return;
    el.classList.remove('cloud-icon','ly-syncing','ly-synced','ly-pending','ly-offline','ly-realtime-live','ly-smart-sync');el.classList.add('ly-cloud-unified');
    el.classList.add(x.mode==='syncing'?'ly-syncing':x.mode==='pending'?'ly-pending':x.mode==='offline'?'ly-offline':'ly-synced');if(x.realtime)el.classList.add('ly-realtime-live');if(x.smartSync)el.classList.add('ly-smart-sync');
    el.dataset.lyUnifiedKey=key;el.innerHTML=`<span class="ly-cloud-unified-body"><span class="ly-cloud-orbit"></span><svg class="ly-cloud-main" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 18.1h9.7a3.85 3.85 0 0 0 .38-7.68A5.25 5.25 0 0 0 7 8.85a4.2 4.2 0 0 0 .2 9.25Z"></path>${mark(x)}</svg><span class="ly-live-dot" aria-hidden="true"></span></span>`;
    const title=titleFor(x);if(el.title!==title)el.title=title;if(el.getAttribute('aria-label')!==title)el.setAttribute('aria-label',title);
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(render);}
  function isRelevantMutation(m){
    let t=m.target;if(!(t instanceof Element)&&t?.parentElement)t=t.parentElement;
    const el=t instanceof Element?t:null;if(!el)return false;
    if(el===lastCloud||el.id==='cloudStatus'||el.closest?.('#cloudStatus'))return !el.closest?.('.ly-cloud-unified-body');
    if(m.type==='childList')return !!(el.closest?.('.top-actions,header')||[...m.addedNodes].some(n=>n.nodeType===1&&(n.id==='cloudStatus'||n.querySelector?.('#cloudStatus'))));
    return false;
  }
  function start(){
    injectStyles();schedule();const root=document.querySelector('.top-actions')||document.querySelector('header')||document.body;
    observer?.disconnect();observer=new MutationObserver(ms=>{if(ms.some(isRelevantMutation)){lastScanKey='';schedule();}});
    observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','title','aria-label']});
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  window.addEventListener('online',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.__lyUnifiedCloudRealtime={version:VERSION,refresh:schedule,status:()=>{const el=document.getElementById('cloudStatus');return el?inferState(el):null;}};
})();
