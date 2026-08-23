(()=>{
  'use strict';
  if(window.__lyNotificationCenterV1)return;
  window.__lyNotificationCenterV1=true;
  const VERSION='2026.08.23.1';
  const LIMIT=60;
  const state={orgId:'',items:[],readCursor:0,latestId:0,ready:false,startTimer:null,localIds:new Set()};
  const text=v=>String(v??'').trim();
  const getClient=()=>{try{if(typeof sb!=='undefined'&&sb?.from)return sb;}catch(e){}return null;};
  const readKey=()=>`lat_yen_notification_read_v1:${state.orgId}`;
  const initializedKey=()=>`lat_yen_notification_initialized_v1:${state.orgId}`;
  const localIdsKey=()=>`lat_yen_notification_local_ids_v1:${state.orgId}`;
  function loadLocalIds(){try{state.localIds=new Set(JSON.parse(localStorage.getItem(localIdsKey())||'[]').map(Number).filter(Boolean));}catch(e){state.localIds=new Set();}}
  function rememberLocalId(id){const n=Number(id)||0;if(!n)return;state.localIds.add(n);const ids=[...state.localIds].sort((a,b)=>b-a).slice(0,80);state.localIds=new Set(ids);try{localStorage.setItem(localIdsKey(),JSON.stringify(ids));}catch(e){}}
  function getRead(){try{return Number(localStorage.getItem(readKey())||0)||0;}catch(e){return 0;}}
  function setRead(id){state.readCursor=Math.max(state.readCursor,Number(id)||0);try{localStorage.setItem(readKey(),String(state.readCursor));}catch(e){}updateBadge();renderList();}
  function money(value){const n=Number(value);if(!Number.isFinite(n)||!n)return '';try{return new Intl.NumberFormat('vi-VN').format(n)+' đ';}catch(e){return String(n)+' đ';}}
  function rule(table){return window.__lyNotificationRules?.[table]||{};}
  function formatRow(row){
    const table=text(row?.entity_table),type=text(row?.event_type).toLowerCase(),r=rule(table),name=text(row?.entity_name),amount=money(row?.amount),details=[];if(name)details.push(name);if(amount)details.push(amount);
    const title=r[type]||(type==='insert'?'Có dữ liệu mới':type==='update'?'Dữ liệu vừa được cập nhật':type==='delete'?'Dữ liệu đã được xóa':'Có thay đổi dữ liệu');
    const id=Number(row?.id)||0;return {id,table,type,entityId:text(row?.entity_id),title,body:details.join(' • ')||(type==='update'?'Nội dung vừa được thay đổi.':type==='delete'?'Dữ liệu đã được xóa.':'Đã thêm dữ liệu mới.'),icon:r.icon||'🔔',panel:r.panel||'',createdAt:row?.created_at||new Date().toISOString(),local:state.localIds.has(id)};
  }
  function dedupe(items){
    const out=[],seen=new Map();
    for(const item of items.sort((a,b)=>a.id-b.id)){
      const key=`${item.table}:${item.entityId||item.id}:${item.type}`;
      const prev=seen.get(key),ts=new Date(item.createdAt).getTime();
      if(prev&&Math.abs(ts-prev.ts)<30000){out[prev.index]=item;seen.set(key,{index:prev.index,ts});continue;}
      seen.set(key,{index:out.length,ts});out.push(item);
    }
    return out.slice(-LIMIT).sort((a,b)=>b.id-a.id);
  }
  function unreadCount(){return state.items.reduce((n,x)=>n+(x.id>state.readCursor&&!x.local?1:0),0);}
  function updateBadge(){
    const badge=document.getElementById('lyNotificationBadge'),btn=document.getElementById('lyNotificationButton'),n=unreadCount();if(!badge||!btn)return;
    badge.textContent=n>99?'99+':String(n);badge.hidden=n===0;btn.classList.toggle('has-unread',n>0);btn.setAttribute('aria-label',n?`Thông báo, ${n} chưa đọc`:'Thông báo');btn.title=n?`${n} thông báo chưa đọc`:'Xem thông báo';
  }
  function relativeTime(v){const t=new Date(v).getTime();if(!Number.isFinite(t))return '';const s=Math.max(0,Math.floor((Date.now()-t)/1000));if(s<60)return 'Vừa xong';if(s<3600)return `${Math.floor(s/60)} phút trước`;if(s<86400)return `${Math.floor(s/3600)} giờ trước`;const d=Math.floor(s/86400);if(d<7)return `${d} ngày trước`;try{return new Date(v).toLocaleDateString('vi-VN');}catch(e){return '';}}
  function injectStyles(){if(document.getElementById('lyNotificationCenterStyles'))return;const s=document.createElement('style');s.id='lyNotificationCenterStyles';s.textContent=`
    .ly-status-cluster{display:flex!important;align-items:center;gap:7px;width:100%;min-width:0}.ly-status-cluster #cloudStatus{flex:0 0 auto!important}.ly-notification-btn{position:relative;width:34px;height:34px;min-width:34px;border:1px solid #dbe3e8;border-radius:9px;background:#fff;color:#475467;display:inline-grid;place-items:center;padding:0;transition:.18s ease;box-shadow:0 1px 2px rgba(16,24,40,.04)}.ly-notification-btn:hover{background:#f8fafc;color:#0f766e}.ly-notification-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.ly-notification-btn.has-unread{color:#0f766e;border-color:#99d5ce;background:#f0fdfa}.ly-notification-badge{position:absolute;top:-6px;right:-7px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#d92d20;color:#fff;font-size:10px;font-weight:800;line-height:18px;text-align:center;border:2px solid #fff}.ly-notification-badge[hidden]{display:none!important}
    #cloudStatus.ly-cloud-dynamic{position:relative!important;overflow:visible!important}.ly-cloud-glyph{position:relative;width:22px;height:22px;display:grid;place-items:center}.ly-cloud-glyph svg{width:20px!important;height:20px!important}.ly-cloud-ring{position:absolute;inset:-1px;border:2px solid transparent;border-top-color:currentColor;border-right-color:currentColor;border-radius:50%;opacity:0}.ly-cloud-dynamic.ly-syncing .ly-cloud-ring{opacity:.7;animation:lyCloudSpin .85s linear infinite}.ly-cloud-dynamic.ly-synced .ly-cloud-glyph{animation:lyCloudPulse .45s ease}.ly-cloud-dynamic.ly-pending{color:#b54708!important;background:#fffaeb!important;border-color:#fedf89!important}.ly-cloud-dynamic.ly-offline{color:#b42318!important;background:#fef3f2!important;border-color:#fecdca!important}@keyframes lyCloudSpin{to{transform:rotate(360deg)}}@keyframes lyCloudPulse{0%{transform:scale(.88)}60%{transform:scale(1.12)}100%{transform:scale(1)}}
    .ly-notify-overlay{position:fixed;inset:0;z-index:2147483645;background:rgba(15,23,42,.34);display:none;align-items:stretch;justify-content:flex-end}.ly-notify-overlay.open{display:flex}.ly-notify-panel{width:min(430px,100vw);height:100%;background:#fff;box-shadow:-18px 0 50px rgba(15,23,42,.18);display:flex;flex-direction:column}.ly-notify-head{padding:16px 16px 12px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px}.ly-notify-head-main{min-width:0;flex:1}.ly-notify-title{font-size:18px;font-weight:850;color:#17202a}.ly-notify-sub{font-size:12px;color:#667085;margin-top:2px}.ly-notify-readall,.ly-notify-close{border:0;background:#f2f4f7;color:#344054;border-radius:9px;padding:8px 10px;font-size:12px;font-weight:700}.ly-notify-close{width:34px;height:34px;padding:0;font-size:21px}.ly-notify-list{overflow:auto;padding:8px 10px 18px;flex:1}.ly-notify-empty{padding:42px 18px;text-align:center;color:#667085}.ly-notify-item{width:100%;border:0;background:#fff;display:grid;grid-template-columns:38px 1fr auto;gap:10px;text-align:left;padding:12px 10px;border-bottom:1px solid #f0f2f5;border-radius:10px;cursor:pointer}.ly-notify-item:hover{background:#f8fafc}.ly-notify-item.unread{background:#f0fdfa}.ly-notify-icon{width:38px;height:38px;border-radius:11px;background:#f2f4f7;display:grid;place-items:center;font-size:19px}.ly-notify-text{min-width:0}.ly-notify-item-title{font-size:13px;font-weight:800;color:#1d2939;line-height:1.35}.ly-notify-item-body{font-size:12.5px;color:#475467;line-height:1.4;margin-top:3px;overflow-wrap:anywhere}.ly-notify-time{font-size:10.5px;color:#98a2b3;white-space:nowrap;padding-top:2px}.ly-notify-local{font-size:10px;color:#667085;margin-top:4px}.ly-unread-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#0f766e;margin-right:6px}
    @media(min-width:761px){.top-actions>.ly-status-cluster{width:100%!important;justify-content:flex-start}.ly-status-cluster #cloudStatus{width:34px!important;min-width:34px!important;height:34px!important;max-width:34px!important}}
    @media(max-width:760px){.ly-status-cluster{width:auto!important;justify-content:flex-end}.ly-notify-panel{width:100vw}.ly-notify-overlay{background:#fff}.ly-notify-panel{box-shadow:none}.ly-notify-head{padding-top:max(16px,env(safe-area-inset-top))}}
  `;document.head.appendChild(s);}
  function ensureButton(){
    injectStyles();const cloud=document.getElementById('cloudStatus');if(!cloud)return false;
    let cluster=document.querySelector('.ly-status-cluster');if(!cluster){cluster=document.createElement('div');cluster.className='ly-status-cluster';cloud.parentNode.insertBefore(cluster,cloud);cluster.appendChild(cloud);}
    let btn=document.getElementById('lyNotificationButton');if(!btn){btn=document.createElement('button');btn.type='button';btn.id='lyNotificationButton';btn.className='ly-notification-btn';btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg><span id="lyNotificationBadge" class="ly-notification-badge" hidden>0</span>';btn.onclick=openCenter;cluster.appendChild(btn);}decorateCloud();updateBadge();return true;
  }
  function decorateCloud(){
    const el=document.getElementById('cloudStatus');if(!el)return;const title=text(el.title||el.textContent).toLowerCase();let mode='synced';if(/gián đoạn|offline|tạm dừng|lỗi/.test(title))mode='offline';else if(/chờ|pending|còn .* mục/.test(title))mode='pending';else if(/đang|tải|đồng bộ|syncing|gửi thay đổi/.test(title))mode='syncing';else if(el.classList.contains('offline'))mode='offline';
    const key=`${mode}:${title}`;if(el.dataset.lyCloudKey===key&&el.querySelector('.ly-cloud-glyph'))return;el.dataset.lyCloudKey=key;el.classList.add('ly-cloud-dynamic');el.classList.remove('ly-syncing','ly-synced','ly-pending','ly-offline');el.classList.add(mode==='syncing'?'ly-syncing':mode==='pending'?'ly-pending':mode==='offline'?'ly-offline':'ly-synced');
    el.innerHTML=`<span class="ly-cloud-glyph"><span class="ly-cloud-ring"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 6.7 8.4 4.5 4.5 0 0 0 7 18Z"></path>${mode==='synced'?'<path d="m9.5 13 1.6 1.6 3.5-3.6"></path>':mode==='offline'?'<path d="M8 8l8 8"></path>':mode==='pending'?'<path d="M12 10v3l2 1"></path>':'<path d="M12 9v6"></path>'}</svg></span>`;
  }
  function observeCloud(){const el=document.getElementById('cloudStatus');if(!el)return;const obs=new MutationObserver(()=>{queueMicrotask(decorateCloud);});obs.observe(el,{attributes:true,childList:true,subtree:true,characterData:true,attributeFilter:['class','title']});setInterval(decorateCloud,1200);}
  function ensureOverlay(){
    let ov=document.getElementById('lyNotificationOverlay');if(ov)return ov;
    ov=document.createElement('div');ov.id='lyNotificationOverlay';ov.className='ly-notify-overlay';ov.innerHTML='<aside class="ly-notify-panel" role="dialog" aria-modal="true" aria-label="Thông báo"><div class="ly-notify-head"><div class="ly-notify-head-main"><div class="ly-notify-title">Thông báo</div><div id="lyNotificationSub" class="ly-notify-sub">Hoạt động gần đây</div></div><button id="lyNotificationReadAll" class="ly-notify-readall" type="button">Đã đọc hết</button><button id="lyNotificationClose" class="ly-notify-close" type="button" aria-label="Đóng">×</button></div><div id="lyNotificationList" class="ly-notify-list"></div></aside>';
    ov.addEventListener('click',e=>{if(e.target===ov)closeCenter();});ov.querySelector('#lyNotificationClose').onclick=closeCenter;ov.querySelector('#lyNotificationReadAll').onclick=()=>setRead(state.latestId);document.body.appendChild(ov);return ov;
  }
  function renderList(){
    const list=document.getElementById('lyNotificationList');if(!list)return;const sub=document.getElementById('lyNotificationSub'),n=unreadCount();if(sub)sub.textContent=n?`${n} chưa đọc • hoạt động gần đây`:'Hoạt động gần đây';
    if(!state.items.length){list.innerHTML='<div class="ly-notify-empty">Chưa có thông báo mới.</div>';return;}
    list.innerHTML='';for(const item of state.items){const btn=document.createElement('button');btn.type='button';btn.className='ly-notify-item'+(item.id>state.readCursor&&!item.local?' unread':'');btn.dataset.panel=item.panel||'';btn.innerHTML=`<span class="ly-notify-icon">${item.icon||'🔔'}</span><span class="ly-notify-text"><span class="ly-notify-item-title">${item.id>state.readCursor&&!item.local?'<span class="ly-unread-dot"></span>':''}${escapeHtml(item.title)}</span><span class="ly-notify-item-body">${escapeHtml(item.body)}</span>${item.local?'<span class="ly-notify-local">Thao tác trên thiết bị này</span>':''}</span><span class="ly-notify-time">${escapeHtml(relativeTime(item.createdAt))}</span>`;btn.onclick=()=>openPanel(item.panel);list.appendChild(btn);}
  }
  function escapeHtml(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function openPanel(panel){if(!panel)return;try{const btn=document.querySelector(`#nav button[data-panel="${CSS.escape(panel)}"]`);if(typeof window.showTab==='function')window.showTab(panel,btn||null);}catch(e){}closeCenter();}
  function openCenter(){ensureOverlay().classList.add('open');renderList();requestAnimationFrame(()=>setRead(state.latestId));}
  function closeCenter(){document.getElementById('lyNotificationOverlay')?.classList.remove('open');}
  function addItem(item){
    if(!item?.id)return;if(item.local)rememberLocalId(item.id);state.latestId=Math.max(state.latestId,item.id);const idx=state.items.findIndex(x=>x.id===item.id);if(idx>=0)state.items[idx]={...state.items[idx],...item};else state.items.unshift(item);state.items=dedupe(state.items).slice(0,LIMIT);if(document.getElementById('lyNotificationOverlay')?.classList.contains('open'))setRead(state.latestId);else{updateBadge();renderList();}
  }
  async function loadHistory(client){
    const {data,error}=await client.from('ly_activity_events').select('id,org_id,entity_table,entity_id,event_type,entity_name,amount,created_at').eq('org_id',state.orgId).order('id',{ascending:false}).limit(80);if(error)throw error;
    loadLocalIds();const rows=data||[];const primaryTimes=rows.filter(r=>['ly_sales','ly_import_receipts','ly_export_receipts','ly_stocktake_receipts'].includes(text(r.entity_table))).map(r=>new Date(r.created_at||0).getTime()).filter(Number.isFinite);const filtered=rows.filter(r=>{if(text(r.entity_table)!=='ly_cashflow_entries')return true;const t=new Date(r.created_at||0).getTime();return !primaryTimes.some(p=>Math.abs(p-t)<=5000);});const raw=filtered.map(formatRow);state.items=dedupe(raw);state.latestId=state.items.reduce((m,x)=>Math.max(m,x.id),0);
    let initialized=false;try{initialized=localStorage.getItem(initializedKey())==='1';}catch(e){}
    state.readCursor=getRead();if(!initialized){state.readCursor=state.latestId;try{localStorage.setItem(readKey(),String(state.readCursor));localStorage.setItem(initializedKey(),'1');}catch(e){}}
    updateBadge();renderList();
  }
  async function start(){
    const client=getClient(),org=text(window.__lyFreshOrgId||'');if(!client||!org){clearTimeout(state.startTimer);state.startTimer=setTimeout(start,700);return;}
    if(state.ready&&state.orgId===org)return;state.orgId=org;ensureButton();ensureOverlay();observeCloud();try{await loadHistory(client);state.ready=true;}catch(e){clearTimeout(state.startTimer);state.startTimer=setTimeout(start,1200);}
  }
  window.addEventListener('latyen:activity',event=>{const d=event?.detail||{};addItem({id:Number(d.id)||0,table:d.table,type:d.type,entityId:d.entityId,title:d.title,body:d.body,icon:d.icon,panel:d.panel,createdAt:d.createdAt,local:!!d.local});});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCenter();});
  window.__lyNotificationCenter={version:VERSION,open:openCenter,close:closeCenter,markAllRead:()=>setRead(state.latestId),status:()=>({version:VERSION,orgId:state.orgId,unread:unreadCount(),latestId:state.latestId,readCursor:state.readCursor})};
  start();
})();
