const CACHE='lat-yen-pwa-v241';
const ASSETS=['./','./index.html','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(ASSETS))
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(
      keys
        .filter(key=>key!==CACHE)
        .map(key=>caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;

  // HTML: network-first so old app versions do not linger.
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        const cache=await caches.open(CACHE);
        cache.put('./index.html',fresh.clone());
        return fresh;
      }catch(e){
        return (
          await caches.match('./index.html')
        )||Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached)return cached;
    const fresh=await fetch(req);
    const cache=await caches.open(CACHE);
    cache.put(req,fresh.clone());
    return fresh;
  })());
});


/* ===== V226 WEB PUSH RECEIVER ===== */
self.addEventListener('push',event=>{
  let payload={};

  try{
    payload=event.data
      ?event.data.json()
      :{};
  }catch(e){
    payload={
      body:event.data?.text?.()||''
    };
  }

  const title=
    payload.title||
    'Quản Lý Lát Yên';

  const options={
    body:
      payload.body||
      'Có thông báo mới.',
    icon:
      payload.icon||
      './icon.svg',
    badge:
      payload.badge||
      './icon.svg',
    tag:
      payload.tag||
      'lat-yen-push',
    renotify:
      !!payload.renotify,
    data:{
      url:
        payload.url||
        './',
      panel:
        payload.panel||
        ''
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();

  const data=
    event.notification.data||
    {};

  event.waitUntil((async()=>{
    const windows=
      await self.clients.matchAll({
        type:'window',
        includeUncontrolled:true
      });

    for(const client of windows){
      try{
        client.postMessage({
          type:'LAT_YEN_NOTIFICATION_OPEN',
          panel:data.panel||''
        });

        if('focus' in client){
          await client.focus();
        }

        return;
      }catch(e){}
    }

    if(self.clients.openWindow){
      const opened=
        await self.clients.openWindow(
          data.url||
          './'
        );

      if(opened){
        setTimeout(()=>{
          try{
            opened.postMessage({
              type:'LAT_YEN_NOTIFICATION_OPEN',
              panel:data.panel||''
            });
          }catch(e){}
        },500);
      }
    }
  })());
});
