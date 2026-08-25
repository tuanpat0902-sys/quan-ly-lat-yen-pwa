const CACHE='lat-yen-fresh-core-v2-authoritative-112';
const INDEX_KEY='./index.html';
const CORE_ASSETS=[
  INDEX_KEY,'./manifest.webmanifest','./icon.svg','./ly-runtime-error-boundary.js','./ly-module-loader.js','./ly-app-version.js','./ly-supabase-bootstrap.js',
  './ly-fresh-core-v2-legacy-hydration.js','./ly-fresh-core-v2-shadow.js','./ly-fresh-core-v2-final-ownership.js',
  './ly-fresh-core-v2-ingredients-takeover.js','./ly-fresh-core-v2-products-takeover.js','./ly-fresh-core-v2-documents-takeover.js',
  './ly-fresh-core-v2-sales-takeover.js','./ly-fresh-core-v2-cashflow-takeover.js','./ly-fresh-core-v2-masterdata-takeover.js',
  './ly-fresh-core-v2-read-takeover.js','./ly-fresh-core-v2-manual-refresh.js','./ly-fresh-core-v2-realtime.js','./ly-fresh-core-v2-realtime-phase2.js',
  './ly-legacy-dom-shim.js','./ly-legacy-state-shim.js','./ly-legacy-helper-shim.js','./ly-legacy-model-shim.js','./ly-legacy-list-shim.js',
  './ly-ui-bootstrap-rescue.js','./ly-independent-bootstrap.js','./ly-warehouse-delete-ux.js','./ly-local-chatbot.js','./ly-settings-enhancements.js','./ly-branding-sync.js','./ly-sidebar-visuals.js','./ly-compact-admin-layout.js','./ly-simulation-personnel.js',
  './ly-history-bridge.js','./ly-activity-history.js','./ly-employees-bridge.js','./ly-employees.js',
  './ly-finance-bridge.js','./ly-finance.js','./ly-reports-bridge.js','./ly-reports.js',
  './ly-settings-ui-bridge.js','./ly-settings-ui.js','./ly-cashflow-bridge.js','./ly-cashflow.js',
  './ly-special-reports-bridge.js','./ly-special-reports.js','./ly-employee-reports-bridge.js','./ly-employee-reports.js',
  './ly-data-notifications.js','./ly-inapp-notifications.js','./ly-notification-center.js','./ly-inventory-alerts.js','./ly-cloud-realtime.js',
  './ly-heavy-panels.js','./ly-menu-security.js','./ly-performance-optimizer.js?v=20260823.4',
  './src-v2/bootstrap.js','./src-v2/core/event-bus.js','./src-v2/core/store.js','./src-v2/data/supabase-gateway.js','./src-v2/domains/create-domains.js',
  './src-v2/domains/ingredients/ingredients-repository.js','./src-v2/domains/ingredients/ingredients-service.js',
  './src-v2/domains/products/products-repository.js','./src-v2/domains/products/products-service.js',
  './src-v2/domains/documents/document-repository.js','./src-v2/domains/sales/sales-repository.js','./src-v2/domains/sales/sales-service.js',
  './src-v2/domains/cashflow/cashflow-repository.js','./src-v2/domains/cashflow/cashflow-service.js',
  './src-v2/domains/inventory/inventory-repository.js','./src-v2/domains/inventory/inventory-service.js',
  './src-v2/domains/master-data/master-data-repository.js','./src-v2/domains/master-data/master-data-service.js'
];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.allSettled(CORE_ASSETS.map(async url=>{try{const r=await fetch(url,{cache:'reload'});if(r.ok)await cache.put(url,r);}catch(e){}}));await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
async function networkFirst(request){try{const response=await fetch(request,{cache:'no-store'});if(response?.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone()).catch(()=>{});}return response;}catch(e){return caches.match(request,{ignoreSearch:false})||caches.match(new URL(request.url).pathname.replace(/^\/quan-ly-lat-yen-pwa\//,'./'));}}
async function navigationSource(request){try{const response=await fetch(request,{cache:'no-store'});if(response?.ok){const cache=await caches.open(CACHE);cache.put(INDEX_KEY,response.clone()).catch(()=>{});}return response;}catch(e){return caches.match(INDEX_KEY);}}
const RPC_TABLE={ly_save_import:'ly_import_receipts',ly_save_export:'ly_export_receipts',ly_save_stocktake:'ly_stocktake_receipts',ly_save_sale:'ly_sales',ly_save_ingredient:'ly_ingredients',ly_save_product:'ly_products',ly_save_warehouse_secure:'ly_warehouses',ly_delete_warehouse_secure:'ly_warehouses'};
function isSupabaseOrigin(url){return url.protocol==='https:'&&/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname);}
function classifyMutation(request,url,body){const method=request.method.toUpperCase();if(!['POST','PUT','PATCH','DELETE'].includes(method)||!isSupabaseOrigin(url)||!url.pathname.startsWith('/rest/v1/'))return '';const rpc=url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1]||'';if(rpc){if(rpc==='ly_delete_receipt'){const kind=String(body?.p_type||body?.p_kind||body?.kind||'').toLowerCase();return kind==='import'?'ly_import_receipts':kind==='export'?'ly_export_receipts':kind==='stocktake'?'ly_stocktake_receipts':kind==='sale'?'ly_sales':'';}return RPC_TABLE[rpc]||'';}const table=url.pathname.replace('/rest/v1/','').split('/')[0];return ['ly_warehouses','ly_suppliers','ly_ingredients','ly_products','ly_prepared_items','ly_inventory','ly_stock_transactions','ly_import_receipts','ly_export_receipts','ly_stocktake_receipts','ly_sales','ly_cashflow_entries'].includes(table)?table:'';}
async function readJsonSafe(request){try{const s=await request.clone().text();return s?JSON.parse(s):null;}catch(e){return null;}}
async function postToClient(clientId,message){if(!clientId)return;try{const client=await self.clients.get(clientId);client?.postMessage(message);}catch(e){}}
async function handleMutation(request,clientId){const url=new URL(request.url),bodyPromise=readJsonSafe(request),response=await fetch(request);if(!response.ok)return response;const table=classifyMutation(request,url,await bodyPromise);if(table)await postToClient(clientId,{type:'LAT_YEN_LOCAL_MUTATION_COMMITTED',entityTable:table,at:Date.now()});return response;}
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(isSupabaseOrigin(url)&&request.method!=='GET'&&request.method!=='HEAD'){event.respondWith(handleMutation(request,event.clientId));return;}if(request.method!=='GET'||url.origin!==location.origin)return;const isNavigation=request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/');event.respondWith(isNavigation?navigationSource(request):networkFirst(request));});
self.addEventListener('notificationclick',event=>{event.notification.close();const data=event.notification?.data||{},target=new URL(data.url||'./',self.location.origin).href;event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin!==self.location.origin)continue;try{await client.focus();client.postMessage({type:'LAT_YEN_NOTIFICATION_OPEN',panel:data.panel||'',table:data.table||'',eventType:data.eventType||''});return;}catch(e){}}if(self.clients.openWindow)await self.clients.openWindow(target);})());});
