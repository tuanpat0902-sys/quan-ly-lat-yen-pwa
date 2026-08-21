const CACHE_NAME='lat-yen-pwa-v182';
const APP_SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(APP_SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(key=>key!==CACHE_NAME)
          .map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;

  if(req.method!=='GET')return;

  const url=new URL(req.url);

  // Navigation: network first, fallback to cached app shell.
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req)
        .then(res=>{
          const copy=res.clone();
          caches.open(CACHE_NAME)
            .then(cache=>cache.put('./index.html',copy))
            .catch(()=>{});
          return res;
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  // Same-origin static resources: cache first.
  if(url.origin===self.location.origin){
    event.respondWith(
      caches.match(req)
        .then(cached=>{
          if(cached)return cached;

          return fetch(req)
            .then(res=>{
              const copy=res.clone();
              caches.open(CACHE_NAME)
                .then(cache=>cache.put(req,copy))
                .catch(()=>{});
              return res;
            });
        })
    );
  }
});
