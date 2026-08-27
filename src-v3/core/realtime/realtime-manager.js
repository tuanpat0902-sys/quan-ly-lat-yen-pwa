export function createRealtimeManager({client,getOrgId,events}){
  if(!client)throw new Error('Realtime manager requires client');
  const channels=new Map();

  function subscribe({id,table,event='*',filter,handler}){
    if(!id||!table||typeof handler!=='function')throw new TypeError('invalid realtime subscription');
    if(channels.has(id))return channels.get(id).unsubscribe;
    const orgId=getOrgId?.();
    const resolvedFilter=filter??(orgId?`org_id=eq.${orgId}`:undefined);
    let channel=client.channel(`v3-${id}-${orgId||'global'}`);
    channel=channel.on('postgres_changes',{event,schema:'public',table,...(resolvedFilter?{filter:resolvedFilter}:{})},payload=>handler(payload));
    channel.subscribe(status=>events?.emit?.('realtime:status',{id,status}));
    const unsubscribe=()=>{try{client.removeChannel(channel);}catch(_){}channels.delete(id);};
    channels.set(id,{channel,unsubscribe,table});
    return unsubscribe;
  }

  function unsubscribe(id){channels.get(id)?.unsubscribe?.();}
  function stopAll(){for(const id of [...channels.keys()])unsubscribe(id);}
  function status(){return [...channels.entries()].map(([id,value])=>({id,table:value.table}));}
  return Object.freeze({subscribe,unsubscribe,stopAll,status});
}
