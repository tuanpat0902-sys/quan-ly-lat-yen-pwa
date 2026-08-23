const CACHE='lat-yen-legacy-ui-fresh-core-9';
const NOTIFICATION_SCRIPT='./ly-data-notifications.js';
const SUPABASE_ORIGIN='https://isfotiyxufvsmlkqsgez.supabase.co';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg',NOTIFICATION_SCRIPT];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

async function networkFirst(request){
  try{
    const response=await fetch(request);
    const cache=await caches.open(CACHE);
    cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch(e){return caches.match(request);}
}

async function navigationWithNotificationLayer(request){
  const response=await networkFirst(request);
  if(!response)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  try{
    let html=await response.text();
    if(!html.includes('ly-data-notifications.js')){
      const script='<script src="./ly-data-notifications.js?v=20260823.3"></script>';
      html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,script+'\n</body>'):html+'\n'+script;
    }
    const headers=new Headers(response.headers);
    headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('content-type','text/html; charset=utf-8');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch(e){console.warn('[Lát Yên] notification layer injection failed',e);return response;}
}

const RPC_MAP={
  ly_save_import:{entityTable:'ly_import_receipts',body:'Đã lưu phiếu nhập lên Cloud.'},
  ly_save_export:{entityTable:'ly_export_receipts',body:'Đã lưu phiếu xuất lên Cloud.'},
  ly_save_stocktake:{entityTable:'ly_stocktake_receipts',body:'Đã lưu phiếu kiểm kê lên Cloud.'},
  ly_save_sale:{entityTable:'ly_sales',body:'Đã lưu phiếu bán hàng lên Cloud.'},
  ly_save_ingredient:{entityTable:'ly_ingredients',body:'Đã lưu nguyên liệu / dụng cụ lên Cloud.'},
  ly_save_product:{entityTable:'ly_products',body:'Đã lưu món / công thức lên Cloud.'},
  ly_delete_receipt:{entityTable:'receipt',body:'Đã xóa phiếu trên Cloud.'}
};

const TABLE_MAP={
  ly_warehouses:'kho',ly_suppliers:'nhà cung cấp',ly_ingredients:'nguyên liệu / dụng cụ',ly_products:'món / công thức',
  ly_import_receipts:'phiếu nhập',ly_export_receipts:'phiếu xuất',ly_stocktake_receipts:'phiếu kiểm kê',ly_sales:'phiếu bán hàng',ly_cashflow_entries:'thu / chi'
};

function classifyMutation(request,url,body){
  const method=request.method.toUpperCase();
  if(!['POST','PUT','PATCH','DELETE'].includes(method)||url.origin!==SUPABASE_ORIGIN||!url.pathname.startsWith('/rest/v1/'))return null;
  const rpcMatch=url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/);
  if(rpcMatch){
    const rpc=rpcMatch[1],cfg=RPC_MAP[rpc];if(!cfg)return null;
    if(rpc==='ly_delete_receipt'){
      const kind=String(body?.p_kind||body?.kind||'').toLowerCase();
      const entityTable=kind==='import'?'ly_import_receipts':kind==='export'?'ly_export_receipts':kind==='stocktake'?'ly_stocktake_receipts':kind==='sale'?'ly_sales':'receipt';
      return {entityTable,body:'Đã xóa phiếu trên Cloud.'};
    }
    return cfg;
  }
  const table=url.pathname.replace('/rest/v1/','').split('/')[0],noun=TABLE_MAP[table];if(!noun)return null;
  const action=method==='DELETE'?'Đã xóa':method==='PATCH'||method==='PUT'?'Đã chỉnh sửa':'Đã lưu';
  return {entityTable:table,body:`${action} ${noun} trên Cloud.`};
}

async function readJsonSafe(request){try{const text=await request.clone().text();return text?JSON.parse(text):null;}catch(e){return null;}}

async function showMutationNotification(info){
  try{
    await self.registration.showNotification('Quản Lý Lát Yên',{
      body:info.body,tag:`ly-local-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,renotify:true,silent:false,requireInteraction:true,
      icon:'./icon.svg',badge:'./icon.svg',timestamp:Date.now(),data:{url:'./',source:'local-mutation',table:info.entityTable}
    });
    return {ok:true,error:''};
  }catch(e){console.warn('[Lát Yên] local mutation notification failed',e);return {ok:false,error:e?.message||String(e)};}
}

async function postToClient(clientId,message){if(!clientId)return;try{const client=await self.clients.get(clientId);client?.postMessage(message);}catch(e){}}

async function handleSupabaseMutation(request,clientId){
  const url=new URL(request.url),bodyPromise=readJsonSafe(request),response=await fetch(request);
  if(!response.ok)return response;
  const body=await bodyPromise,info=classifyMutation(request,url,body);if(!info)return response;
  const result=await showMutationNotification(info);
  if(result.ok){await postToClient(clientId,{type:'LAT_YEN_LOCAL_MUTATION_SHOWN',entityTable:info.entityTable,at:Date.now()});}
  else{await postToClient(clientId,{type:'LAT_YEN_NOTIFICATION_PERMISSION_REQUIRED',error:result.error,at:Date.now()});}
  return response;
}

self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(url.origin===SUPABASE_ORIGIN&&request.method!=='GET'&&request.method!=='HEAD'){
    event.respondWith(handleSupabaseMutation(request,event.clientId));return;
  }
  if(request.method!=='GET'||url.origin!==location.origin)return;
  const isNavigation=request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/');
  event.respondWith(isNavigation?navigationWithNotificationLayer(request):networkFirst(request));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const data=event.notification?.data||{},target=new URL(data.url||'./',self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if(new URL(client.url).origin!==self.location.origin)continue;
      try{await client.focus();client.postMessage({type:'LAT_YEN_NOTIFICATION_OPEN',panel:data.panel||'',table:data.table||'',eventType:data.eventType||''});return;}catch(e){}
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
