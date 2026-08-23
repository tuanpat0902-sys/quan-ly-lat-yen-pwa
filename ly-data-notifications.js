(()=>{
  'use strict';

  if(window.__lyDataActivityNotificationsV2)return;
  window.__lyDataActivityNotificationsV2=true;

  const VERSION='2026.08.23.2';
  const POLL_MS=2500;
  const BATCH_MS=900;
  const SUPPRESS_MS=6000;

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
    orgId:'',
    channel:null,
    pollTimer:null,
    startTimer:null,
    queue:[],
    flushTimer:null,
    localSuppress:new Map(),
    cursor:0,
    ready:false,
    busy:false,
    sequence:0
  };

  function text(v){return String(v??'').trim();}

  function cursorKey(){return `lat_yen_activity_cursor_v2:${state.orgId}`;}

  function readCursor(){
    try{return Number(localStorage.getItem(cursorKey())||0)||0;}catch(e){return 0;}
  }

  function saveCursor(id){
    const n=Number(id)||0;
    if(n<=state.cursor)return;
    state.cursor=n;
    try{localStorage.setItem(cursorKey(),String(n));}catch(e){}
  }

  function actionVi(type){
    if(type==='INSERT')return 'Tạo mới';
    if(type==='UPDATE')return 'Đã chỉnh sửa';
    if(type==='DELETE')return 'Đã xóa';
    return 'Dữ liệu thay đổi';
  }

  function money(value){
    const n=Number(value);
    if(!Number.isFinite(n)||!n)return '';
    try{return new Intl.NumberFormat('vi-VN').format(n)+' đ';}
    catch(e){return String(n)+' đ';}
  }

  function buildItem(row){
    const table=text(row?.entity_table);
    const noun=LABELS[table]||'dữ liệu';
    const type=text(row?.event_type).toUpperCase();
    const name=text(row?.entity_name);
    const amount=money(row?.amount);
    let body=`${actionVi(type)} ${noun}`;
    if(name)body+=`: ${name}`;
    if(amount)body+=` • ${amount}`;
    return {title:'Quản Lý Lát Yên',body,table,type,id:Number(row?.id)||0};
  }

  async function showNotification(item){
    if(!('Notification' in window))return false;
    if(Notification.permission!=='granted'){
      renderPermissionBanner();
      return false;
    }

    state.sequence++;
    const options={
      body:item.body,
      tag:`ly-activity-${Date.now()}-${state.sequence}`,
      renotify:true,
      silent:false,
      icon:'./icon.svg',
      badge:'./icon.svg',
      timestamp:Date.now(),
      data:{url:'./',source:'activity-feed',table:item.table,eventType:item.type}
    };

    try{
      const reg=await navigator.serviceWorker?.ready;
      if(reg?.showNotification){
        await reg.showNotification(item.title,options);
        return true;
      }
    }catch(e){console.warn('[Lát Yên] SW notification fallback',e);}

    try{
      new Notification(item.title,options);
      return true;
    }catch(e){
      console.warn('[Lát Yên] notification failed',e);
      return false;
    }
  }

  function permissionBanner(){return document.getElementById('lyNotifyPermissionBanner');}

  function removePermissionBanner(){permissionBanner()?.remove();}

  async function requestPermission(){
    if(!('Notification' in window))return;
    try{
      const result=await Notification.requestPermission();
      if(result==='granted'){
        removePermissionBanner();
        await showNotification({
          title:'Quản Lý Lát Yên',
          body:'Thông báo đã hoạt động. Mọi thay đổi dữ liệu sẽ được báo trên thiết bị này.',
          table:'',type:'READY'
        });
      }else{
        renderPermissionBanner();
      }
    }catch(e){renderPermissionBanner();}
  }

  function renderPermissionBanner(){
    if(!('Notification' in window))return;
    if(Notification.permission==='granted'){
      removePermissionBanner();
      return;
    }

    let box=permissionBanner();
    if(!box){
      box=document.createElement('div');
      box.id='lyNotifyPermissionBanner';
      box.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;max-width:560px;margin:auto;background:#101828;color:#fff;padding:12px 14px;border-radius:12px;box-shadow:0 12px 35px rgba(0,0,0,.28);font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;display:flex;gap:10px;align-items:center;justify-content:space-between';
      document.body.appendChild(box);
    }

    if(Notification.permission==='denied'){
      box.innerHTML='<span>Chrome đang chặn thông báo. Hãy cho phép <b>Notifications</b> cho trang Lát Yên trong cài đặt trang.</span>';
      return;
    }

    box.innerHTML='<span>Cần bật quyền thông báo để nhận báo khi tạo, sửa hoặc xóa dữ liệu.</span><button id="lyNotifyPermissionButton" type="button" style="border:0;border-radius:9px;padding:8px 11px;font-weight:700;cursor:pointer">Bật thông báo</button>';
    box.querySelector('#lyNotifyPermissionButton')?.addEventListener('click',requestPermission,{once:true});
  }

  function isLocallySuppressed(table){
    const until=Number(state.localSuppress.get(table)||0);
    if(until>Date.now())return true;
    state.localSuppress.delete(table);
    return false;
  }

  function enqueue(row){
    const id=Number(row?.id)||0;
    if(!id||id<=state.cursor)return;
    state.queue.push(row);
    clearTimeout(state.flushTimer);
    state.flushTimer=setTimeout(flush,BATCH_MS);
  }

  async function flush(){
    state.flushTimer=null;
    const rows=state.queue.splice(0).sort((a,b)=>(Number(a.id)||0)-(Number(b.id)||0));
    if(!rows.length)return;

    const seen=new Set();
    const primaryTables=new Set(rows.map(r=>text(r.entity_table)).filter(t=>[
      'ly_import_receipts','ly_export_receipts','ly_stocktake_receipts','ly_sales'
    ].includes(t)));

    for(const row of rows){
      const id=Number(row?.id)||0;
      if(id<=state.cursor)continue;

      const table=text(row?.entity_table);
      saveCursor(id);

      if(isLocallySuppressed(table))continue;
      if(table==='ly_cashflow_entries'&&primaryTables.size)continue;

      const dedupe=`${table}:${text(row?.entity_id)}:${text(row?.event_type)}:${Math.floor(new Date(row?.created_at||0).getTime()/1500)}`;
      if(seen.has(dedupe))continue;
      seen.add(dedupe);

      await showNotification(buildItem(row));
    }
  }

  function getClient(){
    try{if(typeof sb!=='undefined'&&sb?.channel)return sb;}catch(e){}
    return null;
  }

  async function establishBaseline(client){
    state.cursor=readCursor();
    if(state.cursor>0)return;

    const {data,error}=await client
      .from('ly_activity_events')
      .select('id')
      .eq('org_id',state.orgId)
      .order('id',{ascending:false})
      .limit(1);

    if(error)throw error;
    const latest=Number(data?.[0]?.id)||0;
    state.cursor=latest;
    if(latest){
      try{localStorage.setItem(cursorKey(),String(latest));}catch(e){}
    }
  }

  async function poll(){
    if(state.busy||!state.ready)return;
    const client=getClient();
    if(!client)return;
    state.busy=true;

    try{
      const {data,error}=await client
        .from('ly_activity_events')
        .select('id,org_id,entity_table,entity_id,event_type,entity_name,amount,created_at')
        .eq('org_id',state.orgId)
        .gt('id',state.cursor)
        .order('id',{ascending:true})
        .limit(100);

      if(error)throw error;
      for(const row of (data||[]))enqueue(row);
    }catch(e){
      console.warn('[Lát Yên] activity poll',e);
    }finally{
      state.busy=false;
    }
  }

  function stopChannel(){
    const client=getClient();
    if(client&&state.channel){try{client.removeChannel(state.channel)}catch(e){}}
    state.channel=null;
  }

  function schedulePoll(){
    clearInterval(state.pollTimer);
    state.pollTimer=setInterval(poll,POLL_MS);
  }

  async function start(){
    const client=getClient();
    const org=text(window.__lyFreshOrgId||'');

    if(!client||!org){
      clearTimeout(state.startTimer);
      state.startTimer=setTimeout(start,800);
      return;
    }

    if(state.ready&&state.orgId===org)return;

    stopChannel();
    state.orgId=org;
    state.ready=false;

    try{
      await establishBaseline(client);
    }catch(e){
      console.warn('[Lát Yên] activity baseline',e);
      clearTimeout(state.startTimer);
      state.startTimer=setTimeout(start,1200);
      return;
    }

    let ch=client.channel(`latyen-activity-v2-${org}-${Math.random().toString(36).slice(2,8)}`);
    ch=ch.on('postgres_changes',{
      event:'INSERT',schema:'public',table:'ly_activity_events',filter:`org_id=eq.${org}`
    },payload=>enqueue(payload?.new||{}));

    state.channel=ch;
    ch.subscribe(status=>{
      if(status==='SUBSCRIBED'){
        state.ready=true;
        poll();
      }
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
        state.ready=false;
        if(state.channel===ch)state.channel=null;
        clearTimeout(state.startTimer);
        state.startTimer=setTimeout(start,1200);
      }
    });

    schedulePoll();
    renderPermissionBanner();
  }

  navigator.serviceWorker?.addEventListener('message',event=>{
    const data=event?.data||{};
    if(data.type==='LAT_YEN_LOCAL_MUTATION_SHOWN'){
      const table=text(data.entityTable);
      if(table)state.localSuppress.set(table,Date.now()+SUPPRESS_MS);
      return;
    }
    if(data.type==='LAT_YEN_NOTIFICATION_PERMISSION_REQUIRED'){
      renderPermissionBanner();
    }
  });

  window.addEventListener('online',()=>{start();poll();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){start();poll();}});

  window.__lyDataActivityNotifications={
    version:VERSION,
    restart:()=>{state.ready=false;stopChannel();start();},
    poll,
    requestPermission,
    status:()=>({version:VERSION,orgId:state.orgId,connected:!!state.channel,cursor:state.cursor,permission:('Notification' in window)?Notification.permission:'unsupported'})
  };

  start();
})();
