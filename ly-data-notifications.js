(()=>{
  'use strict';

  if(window.__lyDataActivityNotificationsV3)return;
  window.__lyDataActivityNotificationsV3=true;

  const VERSION='2026.08.23.3';
  const POLL_MS=2500;
  const BATCH_MS=900;
  const SUPPRESS_MS=6000;
  const CLIENT_KEY='lat_yen_notification_client_v3';

  const LABELS={
    ly_warehouses:'kho',
    ly_suppliers:'nhà cung cấp',
    ly_ingredients:'nguyên liệu / dụng cụ',
    ly_products:'món / công thức',
    ly_import_receipts:'phiếu nhập',
    ly_export_receipts:'phiếu xuất',
    ly_stocktake_receipts:'phiếu kiểm kê',
    ly_sales:'phiếu bán hàng',
    ly_cashflow_entries:'thu / chi'
  };

  const state={
    orgId:'',channel:null,pollTimer:null,startTimer:null,queue:[],flushTimer:null,
    localSuppress:new Map(),cursor:0,ready:false,busy:false,sequence:0,
    clientId:'',userId:''
  };

  function text(v){return String(v??'').trim();}
  function makeId(){try{return crypto.randomUUID();}catch(e){} return `${Date.now()}-${Math.random().toString(36).slice(2,12)}`;}
  function getClientId(){
    if(state.clientId)return state.clientId;
    try{
      let id=localStorage.getItem(CLIENT_KEY);
      if(!id){id=makeId();localStorage.setItem(CLIENT_KEY,id);}
      state.clientId=id;return id;
    }catch(e){state.clientId=state.clientId||makeId();return state.clientId;}
  }
  function cursorKey(){return `lat_yen_activity_cursor_v3:${state.orgId}`;}
  function readCursor(){try{return Number(localStorage.getItem(cursorKey())||0)||0;}catch(e){return 0;}}
  function saveCursor(id){const n=Number(id)||0;if(n<=state.cursor)return;state.cursor=n;try{localStorage.setItem(cursorKey(),String(n));}catch(e){}}
  function actionVi(type){if(type==='INSERT')return 'Tạo mới';if(type==='UPDATE')return 'Đã chỉnh sửa';if(type==='DELETE')return 'Đã xóa';return 'Dữ liệu thay đổi';}
  function money(value){const n=Number(value);if(!Number.isFinite(n)||!n)return '';try{return new Intl.NumberFormat('vi-VN').format(n)+' đ';}catch(e){return String(n)+' đ';}}
  function buildItem(row){
    const table=text(row?.entity_table),noun=LABELS[table]||'dữ liệu',type=text(row?.event_type).toUpperCase(),name=text(row?.entity_name),amount=money(row?.amount);
    let body=`${actionVi(type)} ${noun}`;if(name)body+=`: ${name}`;if(amount)body+=` • ${amount}`;
    return {title:'Quản Lý Lát Yên',body,table,type,id:Number(row?.id)||0};
  }
  function getClient(){try{if(typeof sb!=='undefined'&&sb?.channel)return sb;}catch(e){}return null;}
  async function currentUserId(client){
    if(state.userId)return state.userId;
    try{const {data}=await client.auth.getUser();state.userId=text(data?.user?.id);}catch(e){}
    return state.userId;
  }
  async function reportTelemetry(status='',error=''){
    const client=getClient();if(!client||!state.orgId)return;
    const userId=await currentUserId(client);if(!userId)return;
    let reg=null;try{reg=await navigator.serviceWorker?.getRegistration?.();}catch(e){}
    const payload={
      client_id:getClientId(),org_id:state.orgId,user_id:userId,user_agent:String(navigator.userAgent||'').slice(0,500),
      permission:('Notification' in window)?Notification.permission:'unsupported',
      sw_supported:'serviceWorker' in navigator,sw_active:!!reg?.active,sw_controller:!!navigator.serviceWorker?.controller,last_seen_at:new Date().toISOString()
    };
    if(status){payload.last_attempt_status=status;payload.last_attempt_error=text(error).slice(0,1000)||null;payload.last_attempt_at=new Date().toISOString();}
    try{await client.from('ly_notification_devices').upsert(payload,{onConflict:'client_id'});}catch(e){console.warn('[Lát Yên] notification telemetry',e);}
  }
  async function showNotification(item){
    if(!('Notification' in window)){await reportTelemetry('unsupported','Notification API unavailable');renderPermissionBanner();return false;}
    if(Notification.permission!=='granted'){await reportTelemetry(`permission_${Notification.permission}`,'Browser permission not granted');renderPermissionBanner(true);return false;}
    state.sequence++;
    const options={body:item.body,tag:`ly-activity-${Date.now()}-${state.sequence}`,renotify:true,silent:false,requireInteraction:true,icon:'./icon.svg',badge:'./icon.svg',timestamp:Date.now(),data:{url:'./',source:'activity-feed',table:item.table,eventType:item.type}};
    try{
      const reg=await navigator.serviceWorker?.ready;
      if(reg?.showNotification){await reg.showNotification(item.title,options);await reportTelemetry('sw_show_success','');return true;}
      await reportTelemetry('sw_not_ready','No ready service worker registration');
    }catch(e){console.warn('[Lát Yên] SW notification fallback',e);await reportTelemetry('sw_show_error',e?.message||String(e));}
    try{new Notification(item.title,options);await reportTelemetry('window_show_success','');return true;}
    catch(e){console.warn('[Lát Yên] notification failed',e);await reportTelemetry('window_show_error',e?.message||String(e));renderPermissionBanner(true);return false;}
  }
  function permissionBanner(){return document.getElementById('lyNotifyPermissionBannerV3');}
  function removePermissionBanner(){permissionBanner()?.remove();}
  async function requestPermission(){
    if(!('Notification' in window)){renderPermissionBanner(true);return;}
    try{
      const result=await Notification.requestPermission();await reportTelemetry(`permission_${result}`,'');
      if(result==='granted'){
        removePermissionBanner();
        await showNotification({title:'Quản Lý Lát Yên',body:'Thông báo đã hoạt động. Mọi thay đổi dữ liệu sẽ được báo trên thiết bị này.',table:'',type:'READY'});
      }else renderPermissionBanner(true);
    }catch(e){await reportTelemetry('permission_request_error',e?.message||String(e));renderPermissionBanner(true);}
  }
  function renderPermissionBanner(force=false){
    if(!document.body)return;
    const supported='Notification' in window,permission=supported?Notification.permission:'unsupported';
    if(permission==='granted'&&!force){removePermissionBanner();return;}
    let box=permissionBanner();
    if(!box){box=document.createElement('div');box.id='lyNotifyPermissionBannerV3';box.style.cssText='position:fixed;left:12px;right:12px;top:12px;z-index:2147483647;max-width:680px;margin:auto;background:#7c2d12;color:#fff;padding:14px 16px;border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,.35);font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;display:flex;gap:12px;align-items:center;justify-content:space-between';document.body.appendChild(box);}
    if(permission==='granted'){
      box.style.background='#065f46';box.innerHTML='<span><b>Thông báo đã được Chrome cho phép.</b> Nếu Windows vẫn không hiện banner, hệ thống đang chặn ở cấp Windows/Edge. Tôi đã bật telemetry để kiểm tra tự động.</span><button id="lyNotifyCloseV3" type="button" style="border:0;border-radius:9px;padding:8px 11px;font-weight:700;cursor:pointer">Đóng</button>';
      box.querySelector('#lyNotifyCloseV3')?.addEventListener('click',removePermissionBanner,{once:true});return;
    }
    if(permission==='denied'){
      box.style.background='#991b1b';box.innerHTML='<span><b>Chrome/Edge đang CHẶN thông báo.</b> Mở quyền của trang/app và đặt <b>Notifications = Allow</b>, sau đó mở lại app.</span>';return;
    }
    if(permission==='unsupported'){
      box.style.background='#991b1b';box.innerHTML='<span>Thiết bị/trình duyệt này không hỗ trợ Notification API.</span>';return;
    }
    box.style.background='#7c2d12';box.innerHTML='<span><b>Chưa cấp quyền thông báo.</b> Đây là lý do bạn không thấy thông báo hệ thống.</span><button id="lyNotifyPermissionButtonV3" type="button" style="border:0;border-radius:9px;padding:9px 13px;font-weight:800;cursor:pointer;background:#fff;color:#7c2d12">Bật thông báo</button>';
    box.querySelector('#lyNotifyPermissionButtonV3')?.addEventListener('click',requestPermission,{once:true});
  }
  function isLocallySuppressed(table){const until=Number(state.localSuppress.get(table)||0);if(until>Date.now())return true;state.localSuppress.delete(table);return false;}
  function enqueue(row){const id=Number(row?.id)||0;if(!id||id<=state.cursor)return;state.queue.push(row);clearTimeout(state.flushTimer);state.flushTimer=setTimeout(flush,BATCH_MS);}
  async function flush(){
    state.flushTimer=null;const rows=state.queue.splice(0).sort((a,b)=>(Number(a.id)||0)-(Number(b.id)||0));if(!rows.length)return;
    const seen=new Set();const primaryTables=new Set(rows.map(r=>text(r.entity_table)).filter(t=>['ly_import_receipts','ly_export_receipts','ly_stocktake_receipts','ly_sales'].includes(t)));
    for(const row of rows){
      const id=Number(row?.id)||0;if(id<=state.cursor)continue;const table=text(row?.entity_table);saveCursor(id);
      if(isLocallySuppressed(table))continue;if(table==='ly_cashflow_entries'&&primaryTables.size)continue;
      const dedupe=`${table}:${text(row?.entity_id)}:${text(row?.event_type)}:${Math.floor(new Date(row?.created_at||0).getTime()/1500)}`;
      if(seen.has(dedupe))continue;seen.add(dedupe);await showNotification(buildItem(row));
    }
  }
  async function establishBaseline(client){
    state.cursor=readCursor();if(state.cursor>0)return;
    const {data,error}=await client.from('ly_activity_events').select('id').eq('org_id',state.orgId).order('id',{ascending:false}).limit(1);
    if(error)throw error;const latest=Number(data?.[0]?.id)||0;state.cursor=latest;if(latest){try{localStorage.setItem(cursorKey(),String(latest));}catch(e){}}
  }
  async function poll(){
    if(state.busy||!state.ready)return;const client=getClient();if(!client)return;state.busy=true;
    try{
      const {data,error}=await client.from('ly_activity_events').select('id,org_id,entity_table,entity_id,event_type,entity_name,amount,created_at').eq('org_id',state.orgId).gt('id',state.cursor).order('id',{ascending:true}).limit(100);
      if(error)throw error;for(const row of (data||[]))enqueue(row);
    }catch(e){console.warn('[Lát Yên] activity poll',e);}finally{state.busy=false;}
  }
  function stopChannel(){const client=getClient();if(client&&state.channel){try{client.removeChannel(state.channel)}catch(e){}}state.channel=null;}
  function schedulePoll(){clearInterval(state.pollTimer);state.pollTimer=setInterval(poll,POLL_MS);}
  async function start(){
    const client=getClient(),org=text(window.__lyFreshOrgId||'');
    if(!client||!org){clearTimeout(state.startTimer);state.startTimer=setTimeout(start,800);return;}
    if(state.ready&&state.orgId===org){reportTelemetry();renderPermissionBanner();return;}
    stopChannel();state.orgId=org;state.ready=false;getClientId();
    try{await establishBaseline(client);await reportTelemetry();}
    catch(e){console.warn('[Lát Yên] activity baseline',e);clearTimeout(state.startTimer);state.startTimer=setTimeout(start,1200);return;}
    let ch=client.channel(`latyen-activity-v3-${org}-${Math.random().toString(36).slice(2,8)}`);
    ch=ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'ly_activity_events',filter:`org_id=eq.${org}`},payload=>enqueue(payload?.new||{}));
    state.channel=ch;
    ch.subscribe(status=>{
      if(status==='SUBSCRIBED'){state.ready=true;reportTelemetry('realtime_subscribed','');poll();}
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
        state.ready=false;reportTelemetry(`realtime_${String(status).toLowerCase()}`,status);if(state.channel===ch)state.channel=null;clearTimeout(state.startTimer);state.startTimer=setTimeout(start,1200);
      }
    });
    schedulePoll();renderPermissionBanner();
  }
  navigator.serviceWorker?.addEventListener('message',event=>{
    const data=event?.data||{};
    if(data.type==='LAT_YEN_LOCAL_MUTATION_SHOWN'){
      const table=text(data.entityTable);if(table)state.localSuppress.set(table,Date.now()+SUPPRESS_MS);reportTelemetry('local_sw_show_success','');return;
    }
    if(data.type==='LAT_YEN_NOTIFICATION_PERMISSION_REQUIRED'){reportTelemetry('local_permission_required',data.error||'');renderPermissionBanner(true);}
  });
  window.addEventListener('online',()=>{start();poll();});
  window.addEventListener('focus',()=>{reportTelemetry();renderPermissionBanner();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){start();poll();reportTelemetry();renderPermissionBanner();}});
  window.__lyDataActivityNotifications={version:VERSION,restart:()=>{state.ready=false;stopChannel();start();},poll,requestPermission,telemetry:reportTelemetry,status:()=>({version:VERSION,orgId:state.orgId,connected:!!state.channel,cursor:state.cursor,permission:('Notification' in window)?Notification.permission:'unsupported',clientId:getClientId()})};
  start();
})();
