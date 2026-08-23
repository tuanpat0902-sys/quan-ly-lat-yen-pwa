const CACHE='lat-yen-fresh-core-v2-authoritative-54';
const INDEX_KEY='./index.html';
const MODULE_LOADER='./ly-module-loader.js';
const HISTORY_BRIDGE='./ly-history-bridge.js';
const ACTIVITY_HISTORY_SCRIPT='./ly-activity-history.js';
const EMPLOYEES_BRIDGE='./ly-employees-bridge.js';
const EMPLOYEES_SCRIPT='./ly-employees.js';
const FINANCE_BRIDGE='./ly-finance-bridge.js';
const FINANCE_SCRIPT='./ly-finance.js';
const REPORTS_BRIDGE='./ly-reports-bridge.js';
const REPORTS_SCRIPT='./ly-reports.js';
const SETTINGS_UI_BRIDGE='./ly-settings-ui-bridge.js';
const SETTINGS_UI_SCRIPT='./ly-settings-ui.js';
const CASHFLOW_BRIDGE='./ly-cashflow-bridge.js';
const CASHFLOW_SCRIPT='./ly-cashflow.js';
const SPECIAL_REPORTS_BRIDGE='./ly-special-reports-bridge.js';
const SPECIAL_REPORTS_SCRIPT='./ly-special-reports.js';
const EMPLOYEE_REPORTS_BRIDGE='./ly-employee-reports-bridge.js';
const EMPLOYEE_REPORTS_SCRIPT='./ly-employee-reports.js';
const SETTINGS_SCRIPT='./ly-settings-enhancements.js';
const NOTIFICATION_SCRIPT='./ly-data-notifications.js';
const APP_VERSION_SCRIPT='./ly-app-version.js';
const INAPP_SCRIPT='./ly-inapp-notifications.js';
const CENTER_SCRIPT='./ly-notification-center.js';
const UNIFIED_STATUS_SCRIPT='./ly-cloud-realtime.js';
const MENU_SECURITY_SCRIPT='./ly-menu-security.js';
const BRANDING_SCRIPT='./ly-branding-sync.js';
const PERFORMANCE_SCRIPT='./ly-performance-optimizer.js';
const HEAVY_SCRIPT='./ly-heavy-panels.js';
const V2_SHADOW_SCRIPT='./ly-fresh-core-v2-shadow.js';
const V2_INGREDIENTS_TAKEOVER_SCRIPT='./ly-fresh-core-v2-ingredients-takeover.js';
const V2_PRODUCTS_TAKEOVER_SCRIPT='./ly-fresh-core-v2-products-takeover.js';
const V2_DOCUMENTS_TAKEOVER_SCRIPT='./ly-fresh-core-v2-documents-takeover.js';
const V2_SALES_TAKEOVER_SCRIPT='./ly-fresh-core-v2-sales-takeover.js';
const V2_CASHFLOW_TAKEOVER_SCRIPT='./ly-fresh-core-v2-cashflow-takeover.js';
const V2_MASTERDATA_TAKEOVER_SCRIPT='./ly-fresh-core-v2-masterdata-takeover.js';
const V2_READ_TAKEOVER_SCRIPT='./ly-fresh-core-v2-read-takeover.js';
const V2_REALTIME_SCRIPT='./ly-fresh-core-v2-realtime.js';
const V2_REALTIME_PHASE2_SCRIPT='./ly-fresh-core-v2-realtime-phase2.js';
const V2_ASSETS=[
  './src-v2/bootstrap.js','./src-v2/core/event-bus.js','./src-v2/core/store.js','./src-v2/data/supabase-gateway.js',
  './src-v2/domains/create-domains.js','./src-v2/domains/ingredients/ingredients-repository.js','./src-v2/domains/ingredients/ingredients-service.js',
  './src-v2/domains/products/products-repository.js','./src-v2/domains/products/products-service.js','./src-v2/domains/documents/document-repository.js',
  './src-v2/domains/sales/sales-repository.js','./src-v2/domains/sales/sales-service.js','./src-v2/domains/cashflow/cashflow-repository.js','./src-v2/domains/cashflow/cashflow-service.js',
  './src-v2/domains/inventory/inventory-repository.js','./src-v2/domains/inventory/inventory-service.js','./src-v2/domains/master-data/master-data-repository.js','./src-v2/domains/master-data/master-data-service.js'
];
const SUPABASE_ORIGIN='https://isfotiyxufvsmlkqsgez.supabase.co';
const ASSETS=[INDEX_KEY,'./manifest.webmanifest','./icon.svg',MODULE_LOADER,HISTORY_BRIDGE,ACTIVITY_HISTORY_SCRIPT,EMPLOYEES_BRIDGE,EMPLOYEES_SCRIPT,FINANCE_BRIDGE,FINANCE_SCRIPT,REPORTS_BRIDGE,REPORTS_SCRIPT,SETTINGS_UI_BRIDGE,SETTINGS_UI_SCRIPT,CASHFLOW_BRIDGE,CASHFLOW_SCRIPT,SPECIAL_REPORTS_BRIDGE,SPECIAL_REPORTS_SCRIPT,EMPLOYEE_REPORTS_BRIDGE,EMPLOYEE_REPORTS_SCRIPT,SETTINGS_SCRIPT,NOTIFICATION_SCRIPT,APP_VERSION_SCRIPT,INAPP_SCRIPT,CENTER_SCRIPT,UNIFIED_STATUS_SCRIPT,MENU_SECURITY_SCRIPT,BRANDING_SCRIPT,PERFORMANCE_SCRIPT,HEAVY_SCRIPT,V2_SHADOW_SCRIPT,V2_INGREDIENTS_TAKEOVER_SCRIPT,V2_PRODUCTS_TAKEOVER_SCRIPT,V2_DOCUMENTS_TAKEOVER_SCRIPT,V2_SALES_TAKEOVER_SCRIPT,V2_CASHFLOW_TAKEOVER_SCRIPT,V2_MASTERDATA_TAKEOVER_SCRIPT,V2_READ_TAKEOVER_SCRIPT,V2_REALTIME_SCRIPT,V2_REALTIME_PHASE2_SCRIPT,...V2_ASSETS];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
async function networkFirst(request){try{const response=await fetch(request);if(response?.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone()).catch(()=>{});}return response;}catch(e){return caches.match(request);}}
async function navigationSource(request){try{const response=await fetch(request);if(response?.ok){const cache=await caches.open(CACHE);cache.put(INDEX_KEY,response.clone()).catch(()=>{});}return response;}catch(e){return caches.match(INDEX_KEY);}}
async function navigationWithLayers(request){const response=await navigationSource(request);if(!response)return response;const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))return response;try{let html=await response.text();const scripts=[];if(!html.includes('ly-module-loader.js'))scripts.push('<script src="./ly-module-loader.js?v=20260824.6"></script>');if(!html.includes('ly-history-bridge.js'))scripts.push('<script src="./ly-history-bridge.js?v=20260823.1"></script>');if(!html.includes('ly-employees-bridge.js'))scripts.push('<script src="./ly-employees-bridge.js?v=20260823.1"></script>');if(!html.includes('ly-finance-bridge.js'))scripts.push('<script src="./ly-finance-bridge.js?v=20260823.1"></script>');if(!html.includes('ly-reports-bridge.js'))scripts.push('<script src="./ly-reports-bridge.js?v=20260823.1"></script>');if(!html.includes('ly-settings-ui-bridge.js'))scripts.push('<script src="./ly-settings-ui-bridge.js?v=20260823.1"></script>');if(!html.includes('ly-cashflow-bridge.js'))scripts.push('<script src="./ly-cashflow-bridge.js?v=20260823.1"></script>');if(!html.includes('ly-special-reports-bridge.js'))scripts.push('<script src="./ly-special-reports-bridge.js?v=20260823.1"></script>');if(!html.includes('ly-employee-reports-bridge.js'))scripts.push('<script src="./ly-employee-reports-bridge.js?v=20260823.1"></script>');if(!html.includes('ly-data-notifications.js'))scripts.push('<script src="./ly-data-notifications.js?v=20260823.6"></script>');if(!html.includes('ly-app-version.js'))scripts.push('<script src="./ly-app-version.js?v=2.1.1"></script>');if(!html.includes('ly-inapp-notifications.js'))scripts.push('<script src="./ly-inapp-notifications.js?v=20260824.2"></script>');if(!html.includes('ly-branding-sync.js'))scripts.push('<script src="./ly-branding-sync.js?v=20260824.1"></script>');if(!html.includes('ly-notification-center.js'))scripts.push('<script src="./ly-notification-center.js?v=20260823.3"></script>');if(!html.includes('ly-cloud-realtime.js'))scripts.push('<script src="./ly-cloud-realtime.js?v=20260823.4"></script>');if(!html.includes('ly-menu-security.js'))scripts.push('<script src="./ly-menu-security.js?v=20260823.1.4"></script>');if(!html.includes('ly-performance-optimizer.js'))scripts.push('<script src="./ly-performance-optimizer.js?v=20260823.4"></script>');if(!html.includes('ly-fresh-core-v2-shadow.js'))scripts.push('<script src="./ly-fresh-core-v2-shadow.js?v=20260823.2"></script>');if(!html.includes('ly-fresh-core-v2-ingredients-takeover.js'))scripts.push('<script src="./ly-fresh-core-v2-ingredients-takeover.js?v=20260823.1"></script>');if(!html.includes('ly-fresh-core-v2-products-takeover.js'))scripts.push('<script src="./ly-fresh-core-v2-products-takeover.js?v=20260823.1"></script>');if(!html.includes('ly-fresh-core-v2-documents-takeover.js'))scripts.push('<script src="./ly-fresh-core-v2-documents-takeover.js?v=20260823.1"></script>');if(!html.includes('ly-fresh-core-v2-sales-takeover.js'))scripts.push('<script src="./ly-fresh-core-v2-sales-takeover.js?v=20260823.1"></script>');if(!html.includes('ly-fresh-core-v2-cashflow-takeover.js'))scripts.push('<script src="./ly-fresh-core-v2-cashflow-takeover.js?v=20260823.1"></script>');if(!html.includes('ly-fresh-core-v2-masterdata-takeover.js'))scripts.push('<script src="./ly-fresh-core-v2-masterdata-takeover.js?v=20260823.5"></script>');if(!html.includes('ly-fresh-core-v2-read-takeover.js'))scripts.push('<script src="./ly-fresh-core-v2-read-takeover.js?v=20260823.1"></script>');if(!html.includes('ly-fresh-core-v2-realtime.js'))scripts.push('<script src="./ly-fresh-core-v2-realtime.js?v=20260823.4"></script>');if(!html.includes('ly-fresh-core-v2-realtime-phase2.js'))scripts.push('<script src="./ly-fresh-core-v2-realtime-phase2.js?v=20260823.1"></script>');if(scripts.length){const block=scripts.join('\n');html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,block+'\n</body>'):html+'\n'+block;}const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('content-type','text/html; charset=utf-8');return new Response(html,{status:response.status,statusText:response.statusText,headers});}catch(e){return response;}}
const RPC_TABLE={ly_save_import:'ly_import_receipts',ly_save_export:'ly_export_receipts',ly_save_stocktake:'ly_stocktake_receipts',ly_save_sale:'ly_sales',ly_save_ingredient:'ly_ingredients',ly_save_product:'ly_products'};
function classifyMutation(request,url,body){const method=request.method.toUpperCase();if(!['POST','PUT','PATCH','DELETE'].includes(method)||url.origin!==SUPABASE_ORIGIN||!url.pathname.startsWith('/rest/v1/'))return '';const rpc=url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1]||'';if(rpc){if(rpc==='ly_delete_receipt'){const kind=String(body?.p_type||body?.p_kind||body?.kind||'').toLowerCase();return kind==='import'?'ly_import_receipts':kind==='export'?'ly_export_receipts':kind==='stocktake'?'ly_stocktake_receipts':kind==='sale'?'ly_sales':'';}return RPC_TABLE[rpc]||'';}const table=url.pathname.replace('/rest/v1/','').split('/')[0];return ['ly_warehouses','ly_suppliers','ly_ingredients','ly_products','ly_prepared_items','ly_inventory','ly_stock_transactions','ly_import_receipts','ly_export_receipts','ly_stocktake_receipts','ly_sales','ly_cashflow_entries'].includes(table)?table:'';}
async function readJsonSafe(request){try{const s=await request.clone().text();return s?JSON.parse(s):null;}catch(e){return null;}}
async function postToClient(clientId,message){if(!clientId)return;try{const client=await self.clients.get(clientId);client?.postMessage(message);}catch(e){}}
async function handleMutation(request,clientId){const url=new URL(request.url),bodyPromise=readJsonSafe(request),response=await fetch(request);if(!response.ok)return response;const table=classifyMutation(request,url,await bodyPromise);if(table)await postToClient(clientId,{type:'LAT_YEN_LOCAL_MUTATION_COMMITTED',entityTable:table,at:Date.now()});return response;}
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(url.origin===SUPABASE_ORIGIN&&request.method!=='GET'&&request.method!=='HEAD'){event.respondWith(handleMutation(request,event.clientId));return;}if(request.method!=='GET'||url.origin!==location.origin)return;const isNavigation=request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/');event.respondWith(isNavigation?navigationWithLayers(request):networkFirst(request));});
self.addEventListener('notificationclick',event=>{event.notification.close();const data=event.notification?.data||{},target=new URL(data.url||'./',self.location.origin).href;event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin!==self.location.origin)continue;try{await client.focus();client.postMessage({type:'LAT_YEN_NOTIFICATION_OPEN',panel:data.panel||'',table:data.table||'',eventType:data.eventType||''});return;}catch(e){}}if(self.clients.openWindow)await self.clients.openWindow(target);})());});
