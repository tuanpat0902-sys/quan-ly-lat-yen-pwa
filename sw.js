const CACHE='lat-yen-legacy-ui-fresh-core-11';
const NOTIFICATION_SCRIPT='./ly-data-notifications.js';
const INAPP_SCRIPT='./ly-inapp-notifications.js';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg',NOTIFICATION_SCRIPT,INAPP_SCRIPT];

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
    const scripts=[];
    if(!html.includes('ly-data-notifications.js'))scripts.push('<script src="./ly-data-notifications.js?v=20260823.4"></script>');
    if(!html.includes('ly-inapp-notifications.js'))scripts.push('<script src="./ly-inapp-notifications.js?v=20260823.2"></script>');
    if(scripts.length){
      const block=scripts.join('\n');
      html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,block+'\n</body>'):html+'\n'+block;
    }
    const headers=new Headers(response.headers);
    headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('content-type','text/html; charset=utf-8');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch(e){console.warn('[Lát Yên] notification layer injection failed',e);return response;}
}

self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
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
