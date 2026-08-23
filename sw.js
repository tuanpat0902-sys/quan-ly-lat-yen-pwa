const CACHE='lat-yen-legacy-ui-fresh-core-7';
const NOTIFICATION_SCRIPT='./ly-data-notifications.js';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg',NOTIFICATION_SCRIPT];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

async function networkFirst(request){
  try{
    const response=await fetch(request);
    const cache=await caches.open(CACHE);
    cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch(e){
    return caches.match(request);
  }
}

async function navigationWithNotificationLayer(request){
  const response=await networkFirst(request);
  if(!response)return response;

  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;

  try{
    let html=await response.text();
    if(!html.includes('ly-data-notifications.js')){
      const script='<script src="./ly-data-notifications.js?v=20260823.1"></script>';
      html=/<\/body>/i.test(html)
        ?html.replace(/<\/body>/i,script+'\n</body>')
        :html+'\n'+script;
    }

    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('etag');
    headers.set('content-type','text/html; charset=utf-8');

    return new Response(html,{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }catch(e){
    console.warn('[Lát Yên] notification layer injection failed',e);
    return response;
  }
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;

  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;

  const isNavigation=
    e.request.mode==='navigate'||
    u.pathname.endsWith('/index.html')||
    u.pathname.endsWith('/');

  e.respondWith(
    isNavigation
      ?navigationWithNotificationLayer(e.request)
      :networkFirst(e.request)
  );
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();

  const data=event.notification?.data||{};
  const target=new URL(data.url||'./',self.location.origin).href;

  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});

    for(const client of windows){
      if(new URL(client.url).origin!==self.location.origin)continue;
      try{
        await client.focus();
        client.postMessage({
          type:'LAT_YEN_NOTIFICATION_OPEN',
          panel:data.panel||'',
          table:data.table||'',
          eventType:data.eventType||''
        });
        return;
      }catch(e){}
    }

    if(self.clients.openWindow){
      await self.clients.openWindow(target);
    }
  })());
});
