export function createHealth({version,store,scheduler,cache,realtime,features,now=()=>Date.now()}){
  const startedAt=now();
  return Object.freeze({
    snapshot:()=>({
      version,
      uptimeMs:now()-startedAt,
      activePanel:store?.getState?.().activePanel??null,
      schedulerTasks:scheduler?.status?.().length??0,
      cacheEntries:cache?.status?.().size??0,
      realtimeSubscriptions:realtime?.status?.().length??0,
      features:features?.status?.()??{}
    })
  });
}
