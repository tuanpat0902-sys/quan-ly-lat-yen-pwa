(()=>{
  'use strict';
  if(window.__lyInAppNotificationsV2)return;
  window.__lyInAppNotificationsV2=true;

  const VERSION='2026.08.23.2';
  const POLL_MS=2500;
  const BATCH_MS=900;
  const NOTICE_RULES={
    ly_sales:{icon:'🧾',insert:'Có hóa đơn bán hàng mới',update:'Hóa đơn bán hàng vừa được cập nhật',delete:'Hóa đơn bán hàng đã được xóa'},
    ly_import_receipts:{icon:'📥',insert:'Có phiếu nhập kho mới',update:'Phiếu nhập kho vừa được cập nhật',delete:'Phiếu nhập kho đã được xóa'},
    ly_export_receipts:{icon:'📤',insert:'Có phiếu xuất kho mới',update:'Phiếu xuất kho vừa được cập nhật',delete:'Phiếu xuất kho đã được xóa'},
    ly_stocktake_receipts:{icon:'📋',insert:'Có phiếu kiểm kê kho mới',update:'Phiếu kiểm kê kho vừa được cập nhật',delete:'Phiếu kiểm kê kho đã được xóa'},
    ly_ingredients:{icon:'🧂',insert:'Có nguyên liệu / dụng cụ mới',update:'Nguyên liệu / dụng cụ vừa được cập nhật',delete:'Nguyên liệu / dụng cụ đã được xóa'},
    ly_products:{icon:'🍽️',insert:'Có món / công thức mới',update:'Món / công thức vừa được cập nhật',delete:'Món / công thức đã được xóa'},
    ly_prepared_items:{icon:'🥣',insert:'Có cấu hình sơ chế mới',update:'Cấu hình sơ chế vừa được cập nhật',delete:'Cấu hình sơ chế đã được xóa'},
    ly_suppliers:{icon:'🚚',insert:'Có nhà cung cấp mới',update:'Nhà cung cấp vừa được cập nhật',delete:'Nhà cung cấp đã được xóa'},
    ly_warehouses:{icon:'🏬',insert:'Có kho mới',update:'Thông tin kho vừa được cập nhật',delete:'Kho đã được xóa'},
    ly_cashflow_entries:{icon:'💵',insert:'Có khoản thu / chi mới',update:'Khoản thu / chi vừa được cập nhật',delete:'Khoản thu / chi đã được xóa'}
  };

  const state={orgId:'',cursor:0,channel:null,pollTimer:null,startTimer:null,busy:false,queue:[],flushTimer:null};
  const text=v=>String(v??'').trim();
  const getClient=()=>{try{if(typeof sb!=='undefined'&&sb?.channel)return sb;}catch(e){}return null;};
  const cursorKey=()=>`lat_yen_inapp_cursor_v2:${state.orgId}`;
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

  function showToast(body,title='Quản Lý Lát Yên',persistent=false,emoji='🔔'){
    if(!document.body)return;
    const root=host();
    while(root.children.length>=4)root.firstElementChild?.remove();
    const card=document.createElement('div');
    card.style.cssText='pointer-events:auto;background:#101828;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:13px 14px;box-shadow:0 16px 45px rgba(0,0,0,.32);display:grid;grid-template-columns:34px 1fr 26px;gap:10px;align-items:start;opacity:0;transform:translateY(-8px);transition:opacity .18s ease,transform .18s ease';
    const icon=document.createElement('div');
    icon.textContent=emoji;
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

  function money(value){const n=Number(value);if(!Number.isFinite(n)||!n)return '';try{return new Intl.NumberFormat('vi-VN').format(n)+' đ';}catch(e){return String(n)+' đ';}}
  function smartItem(row){
    const table=text(row?.entity_table),type=text(row?.event_type).toLowerCase(),name=text(row?.entity_name),amount=money(row?.amount);
    const rule=NOTICE_RULES[table]||{};
    const title=rule[type]||(type==='insert'?'Có dữ liệu mới':type==='update'?'Dữ liệu vừa được cập nhật':type==='delete'?'Dữ liệu đã được xóa':'Dữ liệu vừa thay đổi');
    const details=[];if(name)details.push(name);if(amount)details.push(amount);
    const fallback=type==='insert'?'Đã thêm dữ liệu mới.':type==='update'?'Nội dung vừa được thay đổi.':type==='delete'?'Dữ liệu đã được xóa.':'Có thay đổi dữ liệu.';
    return {table,type,title,body:details.join(' • ')||fallback,icon:rule.icon||'🔔'};
  }
  function enqueue(row){const id=Number(row?.id)||0;if(!id||id<=state.cursor)return;state.queue.push(row);clearTimeout(state.flushTimer);state.flushTimer=setTimeout(flush,BATCH_MS);}
  function flush(){
    state.flushTimer=null;const rows=state.queue.splice(0).sort((a,b)=>(Number(a.id)||0)-(Number(b.id)||0));if(!rows.length)return;
    const seen=new Set();
    const primaryTables=new Set(rows.map(r=>text(r.entity_table)).filter(t=>['ly_import_receipts','ly_export_receipts','ly_stocktake_receipts','ly_sales'].includes(t)));
    for(const row of rows){
      const id=Number(row?.id)||0;if(id<=state.cursor)continue;const table=text(row?.entity_table);saveCursor(id);
      if(table==='ly_cashflow_entries'&&primaryTables.size)continue;
      const dedupe=`${table}:${text(row?.entity_id)}:${text(row?.event_type)}:${Math.floor(new Date(row?.created_at||0).getTime()/1500)}`;
      if(seen.has(dedupe))continue;seen.add(dedupe);
      const item=smartItem(row);showToast(item.body,item.title,false,item.icon);
    }
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
      if(error)throw error;(data||[]).forEach(enqueue);
    }catch(e){console.warn('[Lát Yên] in-app notification poll',e);}finally{state.busy=false;}
  }
  function stop(){const client=getClient();if(client&&state.channel){try{client.removeChannel(state.channel)}catch(e){}}state.channel=null;clearInterval(state.pollTimer);}
  async function start(){
    const client=getClient(),org=text(window.__lyFreshOrgId||'');
    if(!client||!org){clearTimeout(state.startTimer);state.startTimer=setTimeout(start,800);return;}
    if(state.channel&&state.orgId===org)return;
    stop();state.orgId=org;
    try{await baseline(client);}catch(e){clearTimeout(state.startTimer);state.startTimer=setTimeout(start,1200);return;}
    let ch=client.channel(`latyen-inapp-v2-${org}-${Math.random().toString(36).slice(2,8)}`);
    ch=ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'ly_activity_events',filter:`org_id=eq.${org}`},payload=>enqueue(payload?.new||{}));
    state.channel=ch;
    ch.subscribe(status=>{
      if(status==='SUBSCRIBED'){
        poll();
        try{if(!sessionStorage.getItem('ly_inapp_ready_v2')){sessionStorage.setItem('ly_inapp_ready_v2','1');showToast('Sẵn sàng báo các hoạt động mới.','Thông báo đã sẵn sàng',false,'🔔');}}catch(e){}
      }
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){state.channel=null;clearTimeout(state.startTimer);state.startTimer=setTimeout(start,1200);}
    });
    state.pollTimer=setInterval(poll,POLL_MS);
  }

  window.addEventListener('online',()=>{start();poll();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){start();poll();}});
  window.__lyInAppNotifications={version:VERSION,show:showToast,poll,status:()=>({version:VERSION,orgId:state.orgId,cursor:state.cursor,connected:!!state.channel})};
  start();
})();
