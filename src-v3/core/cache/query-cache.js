export function createQueryCache({now=()=>Date.now(),defaultTtlMs=30000,maxEntries=200}={}){
  const map=new Map();
  const touch=(key,entry)=>{map.delete(key);map.set(key,entry);};
  const evict=()=>{while(map.size>maxEntries)map.delete(map.keys().next().value);};
  function get(key,{allowStale=false}={}){
    const entry=map.get(key);if(!entry)return null;
    const stale=now()>entry.expiresAt;
    if(stale&&!allowStale)return null;
    touch(key,entry);return {...entry,stale};
  }
  function set(key,value,{ttlMs=defaultTtlMs,meta={}}={}){
    const entry={value,meta,updatedAt:now(),expiresAt:now()+Math.max(0,ttlMs)};
    touch(key,entry);evict();return value;
  }
  function invalidate(match){
    const predicate=typeof match==='function'?match:key=>String(key).startsWith(String(match));
    for(const key of [...map.keys()])if(predicate(key,map.get(key)))map.delete(key);
  }
  function clear(){map.clear();}
  function status(){return {size:map.size,maxEntries,keys:[...map.keys()]};}
  return Object.freeze({get,set,invalidate,clear,status});
}
