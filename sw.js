const CACHE='lat-yen-legacy-ui-fresh-core-16';
const NOTIFICATION_SCRIPT='./ly-data-notifications.js';
const INAPP_SCRIPT='./ly-inapp-notifications.js';
const CENTER_SCRIPT='./ly-notification-center.js';
const UNIFIED_STATUS_SCRIPT='./ly-cloud-realtime.js';
const MENU_SECURITY_SCRIPT='./ly-menu-security.js';
const SUPABASE_ORIGIN='https://isfotiyxufvsmlkqsgez.supabase.co';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg',NOTIFICATION_SCRIPT,INAPP_SCRIPT,CENTER_SCRIPT,UNIFIED_STATUS_SCRIPT,MENU_SECURITY_SCRIPT];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});

async function networkFirst(request){try{const response=await fetch(request);const cache=await caches.open(CACHE);cache.put(request,response.clone()).catch(()=>{});return response;}catch(e){return caches.match(request);}}
async function navigationWithLayers(request){
  const response=await networkFirst(request);if(!response)return response;const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))return response;
  try{let html=await response.text();const scripts=[];if(!html.includes('ly-data-notifications.js'))scripts.push('<script src="./ly-data-notifications.js?v=20260823.5"></script>');if(!html.includes('ly-inapp-notifications.js'))scripts.push('<script src="./ly-inapp-notifications.js?v=20260823.4"></script>');if(!html.includes('ly-notification-center.js'))scripts.push('<script src="./ly-notification-center.js?v=20260823.2"></script>');if(!html.includes('ly-cloud-realtime.js'))scripts.push('<script src="./ly-cloud-realtime.js?v=20260823.3"></script>');if(!html.includes('ly-menu-security.js'))scripts.push('<script src="./ly-menu-security.js?v=20260823.1.1"></script>');if(scripts.length){const block=scripts.join('\n');html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,block+'\n</body>'):html+'\n'+block;}const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('content-type','text/html; charset=utf-8');return new Response(html,{status:response.status,statusText:response.statusText,headers});}catch(e){return response;}
}

const RPC_TABLE={ly_save_import:'ly_import_receipts',ly_save_export:'ly_export_receipts',ly_save_stocktake:'ly_stocktake_receipts',ly_save_sale:'ly_sales',ly_save_ingredient:'ly_ingredients',ly_save_product:'ly_products'};
function classifyMutation(request,url,body){
  const method=request.method.toUpperCase();if(!['POST','PUT','PATCH','DELETE'].includes(method)||url.origin!==SUPABASE_ORIGIN||!url.pathname.startsWith('/rest/v1/'))return '';
  const rpc=url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1]||'';if(rpc){if(rpc==='ly_delete_receipt'){const kind=String(body?.p_kind||body?.kind||'').toLowerCase();return kind==='import'?'ly_import_receipts':kind==='export'?'ly_export_receipts':kind==='stocktake'?'ly_stocktake_receipts':kind==='sale'?'ly_sales':'';}return RPC_TABLE[rpc]||'';}
  const table=url.pathname.replace('/rest/v1/','').split('/')[0];return ['ly_warehouses','ly_suppliers','ly_ingredients','ly_products','ly_prepared_items','ly_import_receipts','ly_export_receipts','ly_stocktake_receipts','ly_sales','ly_cashflow_entries'].includes(table)?table:'';
}
async function readJsonSafe(request){try{const s=await request.clone().text();return s?JSON.parse(s):null;}catch(e){return null;}}
async function postToClient(clientId,message){if(!clientId)return;try{const client=await self.clients.get(clientId);client?.postMessage(message);}catch(e){}}
async function handleMutation(request,clientId){const url=new URL(request.url),bodyPromise=readJsonSafe(request),response=await fetch(request);if(!response.ok)return response;const table=classifyMutation(request,url,await bodyPromise);if(table)await postToClient(clientId,{type:'LAT_YEN_LOCAL_MUTATION_COMMITTED',entityTable:table,at:Date.now()});return response;}

self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(url.origin===SUPABASE_ORIGIN&&request.method!=='GET'&&request.method!=='HEAD'){event.respondWith(handleMutation(request,event.clientId));return;}
  if(request.method!=='GET'||url.origin!==location.origin)return;
  const isNavigation=request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/');event.respondWith(isNavigation?navigationWithLayers(request):networkFirst(request));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();const data=event.notification?.data||{},target=new URL(data.url||'./',self.location.origin).href;
  event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin!==self.location.origin)continue;try{await client.focus();client.postMessage({type:'LAT_YEN_NOTIFICATION_OPEN',panel:data.panel||'',table:data.table||'',eventType:data.eventType||''});return;}catch(e){}}if(self.clients.openWindow)await self.clients.openWindow(target);})());
});
