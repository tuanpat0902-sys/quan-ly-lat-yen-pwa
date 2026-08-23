(()=>{
  'use strict';
  if(window.__lyInAppNotificationsV1)return;
  window.__lyInAppNotificationsV1=true;

  const VERSION='2026.08.23.1';
  const POLL_MS=2500;
  const SUPPRESS_MS=6500;
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

  const state={orgId:'',cursor:0,channel:null,pollTimer:null,startTimer:null,busy:false,localSuppress:new Map()};
  const text=v=>String(v??'').trim();
  const getClient=()=>{try{if(typeof sb!=='undefined'&&sb?.channel)return sb;}catch(e){}return null;};
  const cursorKey=()=>`lat_yen_inapp_cursor_v1:${state.orgId}`;
  const readCursor=()=>{try{return Number(localStorage.getItem(cursorKey())||0)||0;}catch(e){return 0;}};
  const saveCursor=id=>{const n=Number(id)||0;if(n<=state.cursor)return;state.cursor=n;try{localStorage.setItem(cursorKey(),String(n));}catch(e){}};

  function host(){
    let el=document.getElementById('lyInAppNotificationHost');
    if(el)return el;
    el=document.createElement('div');
    el.id='lyInAppNotificationHost';
    el.setAttribute('aria-live','polite');
    el.style.cssText='position:fixed;top:14px;right:14px;z-index:2147483646;width:min(390px,calc(100vw - 28px));display:flex;flex-direction:column;gap:10px;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    document.body.appendChild(el);
    return el;
  }

  function showToast(body,title='Quản Lý Lát Yên',persistent=false){
    if(!document.body)return;
    const root=host();
    while(root.children.length>=4)root.firstElementChild?.remove();
    const card=document.createElement('div');
    card.style.cssText='pointer-events:auto;background:#101828;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:13px 14px;box-shadow:0 16px 45px rgba(0,0,0,.32);display:grid;grid-template-columns:34px 1fr 26px;gap:10px;align-items:start;opacity:0;transform:translateY(-8px);transition:opacity .18s ease,transform .18s ease';
    const icon=document.createElement('div');
    icon.textContent='🔔';
    icon.style.cssText='width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.10);display:grid;place-items:center;font-size:18px';
    const content=document.createElement('div');
    const h=document.createElement('div');h.textContent=title;h.style.cssText='font-size:13px;font-weight:800;margin-bottom:3px';
    const b=document.createElement('div');b.textContent=body;b.style.cssText='font-size:13px;line-height:1.42;color:#f2f4f7';
    const t=document.createElement('div');t.textContent=new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});t.style.cssText='font-size:11px;color:#98a2b3;margin-top:5px';
    content.append(h,b,t);
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Đóng');close.style.cssText='border:0;background:transparent;color:#d0d5dd;font-size:22px;line-height:22px;cursor:pointer;padding:0';
    close.onclick=()=>card.remove();
    card.append(icon,content,close);root.appendChild(card);
    requestAnimationFrame(()=>{card.style.opacity='1';card.style.transform='translateY(0)';});
    if(!persistent)setTimeout(()=>{card.style.opacity='0';card.style.transform='translateY(-6px)';setTimeout(()=>card.remove(),220);},9000);
  }

  function actionVi(type){if(type==='INSERT')return 'Tạo mới';if(type==='UPDATE')return 'Đã chỉnh sửa';if(type==='DELETE')return 'Đã xóa';return 'Dữ liệu thay đổi';}
  function money(value){const n=Number(value);if(!Number.isFinite(n)||!n)return '';try{return new Intl.NumberFormat('vi-VN').format(n)+' đ';}catch(e){return String(n)+' đ';}}
  function describe(row){
    const table=text(row?.entity_table),noun=LABELS[table]||'dữ liệu',type=text(row?.event_type).toUpperCase(),name=text(row?.entity_name),amount=money(row?.amount);
    let body=`${actionVi(type)} ${noun}`;if(name)body+=`: ${name}`;if(amount)body+=` • ${amount}`;
    return {table,body};
  }
  function suppressed(table){const until=Number(state.localSuppress.get(table)||0);if(until>Date.now())return true;state.localSuppress.delete(table);return false;}
  function handleRow(row){
    const id=Number(row?.id)||0;if(!id||id<=state.cursor)return;
    const {table,body}=describe(row);saveCursor(id);
    if(suppressed(table))return;
    showToast(body);
  }

  async function baseline(client){
    state.cursor=readCursor();if(state.cursor>0)return;
    const {data,error}=await client.from('ly_activity_events').select('id').eq('org_id',state.orgId).order('id',{ascending:false}).limit(1);
    if(error)throw error;
    const latest=Number(data?.[0]?.id)||0;state.cursor=latest;if(latest){try{localStorage.setItem(cursorKey(),String(latest));}catch(e){}}
  }
  async function poll(){
    if(state.busy||!state.orgId)return;const client=getClient();if(!client)return;state.busy=true;
    try{
      const {data,error}=await client.from('ly_activity_events').select('id,org_id,entity_table,entity_id,event_type,entity_name,amount,created_at').eq('org_id',state.orgId).gt('id',state.cursor).order('id',{ascending:true}).limit(100);
      if(error)throw error;(data||[]).forEach(handleRow);
    }catch(e){console.warn('[Lát Yên] in-app notification poll',e);}finally{state.busy=false;}
  }
  function stop(){const client=getClient();if(client&&state.channel){try{client.removeChannel(state.channel)}catch(e){}}state.channel=null;clearInterval(state.pollTimer);}
  async function start(){
    const client=getClient(),org=text(window.__lyFreshOrgId||'');
    if(!client||!org){clearTimeout(state.startTimer);state.startTimer=setTimeout(start,800);return;}
    if(state.channel&&state.orgId===org)return;
    stop();state.orgId=org;
    try{await baseline(client);}catch(e){clearTimeout(state.startTimer);state.startTimer=setTimeout(start,1200);return;}
    let ch=client.channel(`latyen-inapp-v1-${org}-${Math.random().toString(36).slice(2,8)}`);
    ch=ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'ly_activity_events',filter:`org_id=eq.${org}`},payload=>handleRow(payload?.new||{}));
    state.channel=ch;
    ch.subscribe(status=>{if(status==='SUBSCRIBED'){poll();try{if(!sessionStorage.getItem('ly_inapp_ready_v1')){sessionStorage.setItem('ly_inapp_ready_v1','1');showToast('Thông báo trong app đã sẵn sàng.','Quản Lý Lát Yên');}}catch(e){}}if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){state.channel=null;clearTimeout(state.startTimer);state.startTimer=setTimeout(start,1200);}});
    state.pollTimer=setInterval(poll,POLL_MS);
  }

  navigator.serviceWorker?.addEventListener('message',event=>{
    const data=event?.data||{};
    if(data.type==='LAT_YEN_LOCAL_MUTATION_SHOWN'){
      const table=text(data.entityTable),noun=LABELS[table]||'dữ liệu';
      if(table)state.localSuppress.set(table,Date.now()+SUPPRESS_MS);
      showToast(text(data.body)||`Đã lưu ${noun} lên Cloud.`);
    }
  });
  window.addEventListener('online',()=>{start();poll();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){start();poll();}});
  window.__lyInAppNotifications={version:VERSION,show:showToast,poll,status:()=>({version:VERSION,orgId:state.orgId,cursor:state.cursor,connected:!!state.channel})};
  start();
})();
