(()=>{
  'use strict';
  if(window.__lyDataActivityNotificationsV5)return;
  window.__lyDataActivityNotificationsV5=true;

  const VERSION='2026.08.23.5';
  const POLL_MS=3000;
  const BATCH_MS=1000;
  const LOCAL_MS=6500;
  const CLIENT_KEY='lat_yen_notification_client_v5';

  const RULES={
    ly_sales:{icon:'🧾',panel:'sales',insert:'Có hóa đơn bán hàng mới',update:'Hóa đơn bán hàng vừa được cập nhật',delete:'Hóa đơn bán hàng đã được xóa',popup:{insert:1,update:1,delete:1}},
    ly_import_receipts:{icon:'📥',panel:'imports',insert:'Có phiếu nhập kho mới',update:'Phiếu nhập kho vừa được cập nhật',delete:'Phiếu nhập kho đã được xóa',popup:{insert:1,update:1,delete:1}},
    ly_export_receipts:{icon:'📤',panel:'imports',insert:'Có phiếu xuất kho mới',update:'Phiếu xuất kho vừa được cập nhật',delete:'Phiếu xuất kho đã được xóa',popup:{insert:1,update:1,delete:1}},
    ly_stocktake_receipts:{icon:'📋',panel:'stocktake',insert:'Có phiếu kiểm kê kho mới',update:'Phiếu kiểm kê kho vừa được cập nhật',delete:'Phiếu kiểm kê kho đã được xóa',popup:{insert:1,update:1,delete:1}},
    ly_ingredients:{icon:'🧂',panel:'ingredients',insert:'Có nguyên liệu / dụng cụ mới',update:'Nguyên liệu / dụng cụ vừa được cập nhật',delete:'Nguyên liệu / dụng cụ đã được xóa',popup:{insert:1,update:0,delete:1}},
    ly_products:{icon:'🍽️',panel:'recipes',insert:'Có món / công thức mới',update:'Món / công thức vừa được cập nhật',delete:'Món / công thức đã được xóa',popup:{insert:1,update:0,delete:1}},
    ly_prepared_items:{icon:'🥣',panel:'recipes',insert:'Có cấu hình sơ chế mới',update:'Cấu hình sơ chế vừa được cập nhật',delete:'Cấu hình sơ chế đã được xóa',popup:{insert:1,update:0,delete:1}},
    ly_suppliers:{icon:'🚚',panel:'suppliers',insert:'Có nhà cung cấp mới',update:'Nhà cung cấp vừa được cập nhật',delete:'Nhà cung cấp đã được xóa',popup:{insert:1,update:0,delete:1}},
    ly_warehouses:{icon:'🏬',panel:'warehouses',insert:'Có kho mới',update:'Thông tin kho vừa được cập nhật',delete:'Kho đã được xóa',popup:{insert:1,update:0,delete:1}},
    ly_cashflow_entries:{icon:'💵',panel:'cashflow',insert:'Có khoản thu / chi mới',update:'Khoản thu / chi vừa được cập nhật',delete:'Khoản thu / chi đã được xóa',popup:{insert:1,update:0,delete:1}}
  };

  const PRIMARY=new Set(['ly_sales','ly_import_receipts','ly_export_receipts','ly_stocktake_receipts']);
  const state={orgId:'',channel:null,pollTimer:null,startTimer:null,queue:[],flushTimer:null,cursor:0,ready:false,busy:false,sequence:0,clientId:'',userId:'',localTables:new Map(),recentPrimaryUntil:0};

  const text=v=>String(v??'').trim();
  const now=()=>Date.now();
  function makeId(){try{return crypto.randomUUID();}catch(e){}return `${Date.now()}-${Math.random().toString(36).slice(2,12)}`;}
  function getClientId(){if(state.clientId)return state.clientId;try{let id=localStorage.getItem(CLIENT_KEY);if(!id){id=makeId();localStorage.setItem(CLIENT_KEY,id);}state.clientId=id;return id;}catch(e){state.clientId=state.clientId||makeId();return state.clientId;}}
  const cursorKey=()=>`lat_yen_activity_cursor_v5:${state.orgId}`;
  function readCursor(){try{return Number(localStorage.getItem(cursorKey())||0)||0;}catch(e){return 0;}}
  function saveCursor(id){const n=Number(id)||0;if(n<=state.cursor)return;state.cursor=n;try{localStorage.setItem(cursorKey(),String(n));}catch(e){}}
  function money(value){const n=Number(value);if(!Number.isFinite(n)||!n)return '';try{return new Intl.NumberFormat('vi-VN').format(n)+' đ';}catch(e){return String(n)+' đ';}}
  function getClient(){try{if(typeof sb!=='undefined'&&sb?.channel)return sb;}catch(e){}return null;}

  function smartItem(row){
    const table=text(row?.entity_table),type=text(row?.event_type).toLowerCase(),name=text(row?.entity_name),amount=money(row?.amount),rule=RULES[table]||{};
    const title=rule[type]||(type==='insert'?'Có dữ liệu mới':type==='update'?'Dữ liệu vừa được cập nhật':type==='delete'?'Dữ liệu đã được xóa':'Có thay đổi dữ liệu');
    const details=[];if(name)details.push(name);if(amount)details.push(amount);
    const fallback=type==='insert'?'Đã thêm dữ liệu mới.':type==='update'?'Nội dung vừa được thay đổi.':type==='delete'?'Dữ liệu đã được xóa.':'Có thay đổi dữ liệu.';
    const entityId=text(row?.entity_id),local=isLocalTable(table);
    return {id:Number(row?.id)||0,table,type,entityId,title,body:details.join(' • ')||fallback,icon:rule.icon||'🔔',panel:rule.panel||'',popup:!!rule.popup?.[type]&&!local,local,createdAt:row?.created_at||new Date().toISOString(),amount:row?.amount??null,name};
  }
  function markLocal(table){if(table)state.localTables.set(table,now()+LOCAL_MS);}
  function isLocalTable(table){const until=Number(state.localTables.get(table)||0);if(until>now())return true;if(until)state.localTables.delete(table);return false;}

  async function currentUserId(client){if(state.userId)return state.userId;try{const {data}=await client.auth.getUser();state.userId=text(data?.user?.id);}catch(e){}return state.userId;}
  async function reportTelemetry(status='',error=''){
    const client=getClient();if(!client||!state.orgId)return;const userId=await currentUserId(client);if(!userId)return;let reg=null;try{reg=await navigator.serviceWorker?.getRegistration?.();}catch(e){}
    const payload={client_id:getClientId(),org_id:state.orgId,user_id:userId,user_agent:String(navigator.userAgent||'').slice(0,500),permission:('Notification' in window)?Notification.permission:'unsupported',sw_supported:'serviceWorker' in navigator,sw_active:!!reg?.active,sw_controller:!!navigator.serviceWorker?.controller,last_seen_at:new Date().toISOString()};if(status){payload.last_attempt_status=status;payload.last_attempt_error=text(error).slice(0,1000)||null;payload.last_attempt_at=new Date().toISOString();}try{await client.from('ly_notification_devices').upsert(payload,{onConflict:'client_id'});}catch(e){}
  }
  async function showNative(item){
    if(!item.popup||!document.hidden)return false;if(!('Notification' in window)||Notification.permission!=='granted'){renderPermissionBanner();return false;}state.sequence++;
    const options={body:item.body,tag:`ly-activity-${item.id||Date.now()}-${state.sequence}`,renotify:false,silent:false,requireInteraction:false,icon:'./icon.svg',badge:'./icon.svg',timestamp:Date.now(),data:{url:'./',source:'activity-feed',table:item.table,eventType:item.type,panel:item.panel}};
    try{const reg=await navigator.serviceWorker?.ready;if(reg?.showNotification){await reg.showNotification(item.title,options);await reportTelemetry('sw_show_success','');return true;}}catch(e){await reportTelemetry('sw_show_error',e?.message||String(e));}return false;
  }

  function permissionBanner(){return document.getElementById('lyNotifyPermissionBannerV5');}
  function removePermissionBanner(){permissionBanner()?.remove();}
  async function requestPermission(){if(!('Notification' in window))return;try{const result=await Notification.requestPermission();await reportTelemetry(`permission_${result}`,'');if(result==='granted')removePermissionBanner();else renderPermissionBanner();}catch(e){await reportTelemetry('permission_request_error',e?.message||String(e));}}
  function renderPermissionBanner(){
    if(!document.body||!('Notification' in window)||Notification.permission==='granted'){removePermissionBanner();return;}let box=permissionBanner();if(!box){box=document.createElement('div');box.id='lyNotifyPermissionBannerV5';box.style.cssText='position:fixed;left:12px;right:12px;top:12px;z-index:2147483647;max-width:620px;margin:auto;background:#7c2d12;color:#fff;padding:12px 14px;border-radius:12px;box-shadow:0 18px 48px rgba(0,0,0,.28);font:13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;display:flex;gap:12px;align-items:center;justify-content:space-between';document.body.appendChild(box);}if(Notification.permission==='denied'){box.innerHTML='<span><b>Thông báo hệ thống đang bị chặn.</b> Trung tâm thông báo trong app vẫn hoạt động bình thường.</span>';return;}box.innerHTML='<span><b>Bật thông báo hệ thống?</b> Khi app chạy nền, các hoạt động quan trọng sẽ được báo.</span><button id="lyNotifyPermissionButtonV5" type="button" style="border:0;border-radius:9px;padding:8px 12px;font-weight:800;cursor:pointer;background:#fff;color:#7c2d12">Bật</button>';box.querySelector('#lyNotifyPermissionButtonV5')?.addEventListener('click',requestPermission,{once:true});
  }

  function dispatchItem(item,row){try{window.dispatchEvent(new CustomEvent('latyen:activity',{detail:{...item,row}}));}catch(e){}showNative(item);}
  function enqueue(row){const id=Number(row?.id)||0;if(!id||id<=state.cursor)return;state.queue.push(row);clearTimeout(state.flushTimer);state.flushTimer=setTimeout(flush,BATCH_MS);}
  function flush(){
    state.flushTimer=null;const rows=state.queue.splice(0).sort((a,b)=>(Number(a.id)||0)-(Number(b.id)||0));if(!rows.length)return;const primaryTables=new Set(rows.map(r=>text(r.entity_table)).filter(t=>PRIMARY.has(t)));if(primaryTables.size)state.recentPrimaryUntil=now()+5000;const collapsed=new Map();
    for(const row of rows){const table=text(row?.entity_table),id=Number(row?.id)||0;if(!id||id<=state.cursor)continue;saveCursor(id);if(table==='ly_cashflow_entries'&&(primaryTables.size||now()<state.recentPrimaryUntil))continue;const type=text(row?.event_type).toLowerCase(),entity=text(row?.entity_id)||String(id),key=`${table}:${entity}:${type}`;collapsed.set(key,row);}
    [...collapsed.values()].sort((a,b)=>(Number(a.id)||0)-(Number(b.id)||0)).forEach(row=>dispatchItem(smartItem(row),row));
  }

  async function establishBaseline(client){state.cursor=readCursor();if(state.cursor>0)return;const {data,error}=await client.from('ly_activity_events').select('id').eq('org_id',state.orgId).order('id',{ascending:false}).limit(1);if(error)throw error;const latest=Number(data?.[0]?.id)||0;state.cursor=latest;if(latest){try{localStorage.setItem(cursorKey(),String(latest));}catch(e){}}}
  async function poll(){if(state.busy||!state.ready)return;const client=getClient();if(!client)return;state.busy=true;try{const {data,error}=await client.from('ly_activity_events').select('id,org_id,entity_table,entity_id,event_type,entity_name,amount,created_at').eq('org_id',state.orgId).gt('id',state.cursor).order('id',{ascending:true}).limit(100);if(error)throw error;for(const row of(data||[]))enqueue(row);}catch(e){}finally{state.busy=false;}}
  function stopChannel(){const client=getClient();if(client&&state.channel){try{client.removeChannel(state.channel);}catch(e){}}state.channel=null;}
  function schedulePoll(){clearInterval(state.pollTimer);state.pollTimer=setInterval(poll,POLL_MS);}
  async function start(){
    const client=getClient(),org=text(window.__lyFreshOrgId||'');if(!client||!org){clearTimeout(state.startTimer);state.startTimer=setTimeout(start,800);return;}if(state.ready&&state.orgId===org){renderPermissionBanner();return;}stopChannel();state.orgId=org;state.ready=false;getClientId();try{await establishBaseline(client);await reportTelemetry();}catch(e){clearTimeout(state.startTimer);state.startTimer=setTimeout(start,1200);return;}let ch=client.channel(`latyen-activity-v5-${org}-${Math.random().toString(36).slice(2,8)}`);ch=ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'ly_activity_events',filter:`org_id=eq.${org}`},payload=>enqueue(payload?.new||{}));state.channel=ch;ch.subscribe(status=>{if(status==='SUBSCRIBED'){state.ready=true;reportTelemetry('realtime_subscribed','');poll();}if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){state.ready=false;if(state.channel===ch)state.channel=null;clearTimeout(state.startTimer);state.startTimer=setTimeout(start,1200);}});schedulePoll();renderPermissionBanner();
  }

  navigator.serviceWorker?.addEventListener('message',event=>{const data=event?.data||{};if(data.type==='LAT_YEN_LOCAL_MUTATION_COMMITTED'){markLocal(text(data.entityTable));return;}if(data.type==='LAT_YEN_NOTIFICATION_OPEN'&&data.panel){try{const btn=document.querySelector(`#nav button[data-panel="${CSS.escape(data.panel)}"]`);if(typeof window.showTab==='function')window.showTab(data.panel,btn||null);}catch(e){}}});
  window.addEventListener('online',()=>{start();poll();});document.addEventListener('visibilitychange',()=>{if(!document.hidden){start();poll();}});window.__lyNotificationRules=RULES;window.__lyDataActivityNotifications={version:VERSION,restart:()=>{state.ready=false;stopChannel();start();},poll,requestPermission,telemetry:reportTelemetry,status:()=>({version:VERSION,orgId:state.orgId,connected:!!state.channel,cursor:state.cursor,permission:('Notification'in window)?Notification.permission:'unsupported',clientId:getClientId()})};start();
})();
