(()=>{
  'use strict';

  if(window.__lyDataActivityNotificationsV1)return;
  window.__lyDataActivityNotificationsV1=true;

  const VERSION='2026.08.23.1';
  const CHANNEL_PREFIX='latyen-data-activity-v1';
  const BATCH_MS=850;
  const RETRY_MS=1200;

  const WATCH_TABLES=[
    'ly_warehouses',
    'ly_suppliers',
    'ly_ingredients',
    'ly_inventory',
    'ly_products',
    'ly_prepared_items',
    'ly_recipe_items',
    'ly_import_receipts',
    'ly_import_items',
    'ly_export_receipts',
    'ly_export_items',
    'ly_stocktake_receipts',
    'ly_stocktake_items',
    'ly_sales',
    'ly_sale_items',
    'ly_cashflow_entries',
    'ly_stock_transactions'
  ];

  const TOP_LEVEL={
    ly_warehouses:{noun:'kho',name:['name']},
    ly_suppliers:{noun:'nhà cung cấp',name:['name']},
    ly_ingredients:{noun:'nguyên liệu / dụng cụ',name:['name']},
    ly_products:{noun:'món / công thức',name:['name']},
    ly_import_receipts:{noun:'phiếu nhập',name:['receipt_no','code']},
    ly_export_receipts:{noun:'phiếu xuất',name:['receipt_no','code']},
    ly_stocktake_receipts:{noun:'phiếu kiểm kê',name:['receipt_no','code']},
    ly_sales:{noun:'phiếu bán hàng',name:['receipt_no','code']},
    ly_cashflow_entries:{noun:'thu / chi',name:['category','description','note']}
  };

  const state={
    orgId:null,
    channel:null,
    queue:[],
    flushTimer:null,
    startTimer:null,
    sequence:0
  };

  function text(value){
    return String(value??'').trim();
  }

  function eventType(payload){
    return text(payload?.eventType||payload?.type).toUpperCase();
  }

  function rowOf(payload){
    const type=eventType(payload);
    if(type==='DELETE')return payload?.old||{};
    return payload?.new||payload?.record||{};
  }

  function orgOf(payload){
    return text(payload?.new?.org_id||payload?.old?.org_id||payload?.record?.org_id||'');
  }

  function actionVi(type){
    if(type==='INSERT')return 'Tạo mới';
    if(type==='UPDATE')return 'Đã chỉnh sửa';
    if(type==='DELETE')return 'Đã xóa';
    return 'Dữ liệu thay đổi';
  }

  function nameOf(row,fields=[]){
    for(const field of fields){
      const value=text(row?.[field]);
      if(value)return value;
    }
    return '';
  }

  function amountOf(row){
    const raw=row?.total_amount ?? row?.amount ?? row?.total ?? null;
    const n=Number(raw);
    if(!Number.isFinite(n)||!n)return '';
    try{
      return new Intl.NumberFormat('vi-VN').format(n)+' đ';
    }catch(e){
      return String(n)+' đ';
    }
  }

  function idOf(row){
    return text(row?.id||row?.receipt_id||row?.sale_id||row?.product_id||row?.ingredient_id||'');
  }

  function describeTopLevel(table,payload){
    const cfg=TOP_LEVEL[table];
    if(!cfg)return null;

    const type=eventType(payload);
    const row=rowOf(payload);
    const name=nameOf(row,cfg.name);
    const amount=amountOf(row);
    const action=actionVi(type);

    let body=`${action} ${cfg.noun}`;
    if(name)body+=`: ${name}`;
    if(amount)body+=` • ${amount}`;

    return {
      key:`${table}:${idOf(row)||'row'}:${type}`,
      title:'Quản Lý Lát Yên',
      body,
      table,
      type,
      row
    };
  }

  function describeNested(table,payload){
    const type=eventType(payload);
    const row=rowOf(payload);

    if(table==='ly_recipe_items'){
      return {
        key:`recipe:${text(row?.product_id)||'unknown'}`,
        title:'Quản Lý Lát Yên',
        body:'Công thức món đã được chỉnh sửa.',
        table,
        type,
        row
      };
    }

    if(table==='ly_prepared_items'){
      return {
        key:`prepared:${text(row?.ingredient_id||row?.source_ingredient_id)||'unknown'}`,
        title:'Quản Lý Lát Yên',
        body:'Dữ liệu sơ chế / thành phần đã được chỉnh sửa.',
        table,
        type,
        row
      };
    }

    return null;
  }

  function describeInternalFallback(events){
    if(!events.length)return null;

    const tables=new Set(events.map(e=>e.table));

    if(tables.has('ly_import_items')){
      return {key:'fallback:import',title:'Quản Lý Lát Yên',body:'Chi tiết phiếu nhập đã thay đổi.'};
    }
    if(tables.has('ly_export_items')){
      return {key:'fallback:export',title:'Quản Lý Lát Yên',body:'Chi tiết phiếu xuất đã thay đổi.'};
    }
    if(tables.has('ly_stocktake_items')){
      return {key:'fallback:stocktake',title:'Quản Lý Lát Yên',body:'Chi tiết kiểm kê đã thay đổi.'};
    }
    if(tables.has('ly_sale_items')){
      return {key:'fallback:sale',title:'Quản Lý Lát Yên',body:'Chi tiết bán hàng đã thay đổi.'};
    }
    if(tables.has('ly_inventory')||tables.has('ly_stock_transactions')){
      return {key:'fallback:inventory',title:'Quản Lý Lát Yên',body:'Dữ liệu tồn kho đã thay đổi.'};
    }

    return null;
  }

  async function showNotification(item){
    if(!('Notification' in window))return false;
    if(Notification.permission!=='granted')return false;

    state.sequence+=1;
    const tag=`ly-activity-${Date.now()}-${state.sequence}`;
    const options={
      body:text(item?.body),
      tag,
      renotify:true,
      silent:false,
      icon:'./icon.svg',
      badge:'./icon.svg',
      timestamp:Date.now(),
      data:{
        url:'./',
        source:'data-activity',
        table:item?.table||'',
        eventType:item?.type||''
      }
    };

    try{
      const reg=await navigator.serviceWorker?.ready;
      if(reg?.showNotification){
        await reg.showNotification(item?.title||'Quản Lý Lát Yên',options);
        return true;
      }
    }catch(e){
      console.warn('[Lát Yên] SW notification fallback',e);
    }

    try{
      new Notification(item?.title||'Quản Lý Lát Yên',options);
      return true;
    }catch(e){
      console.warn('[Lát Yên] notification failed',e);
      return false;
    }
  }

  async function flush(){
    state.flushTimer=null;
    const events=state.queue.splice(0);
    if(!events.length)return;

    const top=[];
    const nested=[];
    const internal=[];

    for(const event of events){
      const topItem=describeTopLevel(event.table,event.payload);
      if(topItem){
        top.push(topItem);
        continue;
      }

      const nestedItem=describeNested(event.table,event.payload);
      if(nestedItem){
        nested.push(nestedItem);
        continue;
      }

      internal.push(event);
    }

    const selected=[];
    const seen=new Set();

    for(const item of top){
      if(seen.has(item.key))continue;
      seen.add(item.key);
      selected.push(item);
    }

    const hasProductTop=top.some(x=>x.table==='ly_products');
    const hasIngredientTop=top.some(x=>x.table==='ly_ingredients');

    for(const item of nested){
      if(item.table==='ly_recipe_items'&&hasProductTop)continue;
      if(item.table==='ly_prepared_items'&&hasIngredientTop)continue;
      if(seen.has(item.key))continue;
      seen.add(item.key);
      selected.push(item);
    }

    const hasImportTop=top.some(x=>x.table==='ly_import_receipts');
    const hasExportTop=top.some(x=>x.table==='ly_export_receipts');
    const hasStocktakeTop=top.some(x=>x.table==='ly_stocktake_receipts');
    const hasSaleTop=top.some(x=>x.table==='ly_sales');
    const businessTop=hasImportTop||hasExportTop||hasStocktakeTop||hasSaleTop;

    if(internal.length&&!businessTop){
      const fallback=describeInternalFallback(internal);
      if(fallback&&!seen.has(fallback.key)){
        seen.add(fallback.key);
        selected.push(fallback);
      }
    }

    for(const item of selected){
      await showNotification(item);
    }
  }

  function enqueue(table,payload){
    const org=orgOf(payload);
    if(org&&state.orgId&&org!==state.orgId)return;

    state.queue.push({table,payload});
    clearTimeout(state.flushTimer);
    state.flushTimer=setTimeout(flush,BATCH_MS);
  }

  function getClient(){
    try{
      if(typeof sb!=='undefined'&&sb?.channel)return sb;
    }catch(e){}
    return null;
  }

  function stopChannel(){
    const client=getClient();
    if(client&&state.channel){
      try{client.removeChannel(state.channel)}catch(e){}
    }
    state.channel=null;
  }

  function start(){
    const client=getClient();
    const org=text(window.__lyFreshOrgId||'');

    if(!client||!org){
      clearTimeout(state.startTimer);
      state.startTimer=setTimeout(start,RETRY_MS);
      return;
    }

    if(state.channel&&state.orgId===org)return;

    stopChannel();
    state.orgId=org;

    let ch=client.channel(`${CHANNEL_PREFIX}-${org}-${Math.random().toString(36).slice(2,8)}`);

    for(const table of WATCH_TABLES){
      ch=ch.on(
        'postgres_changes',
        {event:'*',schema:'public',table},
        payload=>enqueue(table,payload)
      );
    }

    state.channel=ch;
    ch.subscribe(status=>{
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
        if(state.channel===ch)state.channel=null;
        clearTimeout(state.startTimer);
        state.startTimer=setTimeout(start,RETRY_MS);
      }
    });
  }

  window.addEventListener('online',start);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)start();
  });

  window.__lyDataActivityNotifications={
    version:VERSION,
    restart:()=>{stopChannel();start();},
    status:()=>({version:VERSION,orgId:state.orgId,connected:!!state.channel})
  };

  start();
})();
