(()=>{
  'use strict';
  const VERSION='2026.09.22.1';
  const DOMAINS={
    core:['ly_warehouses','ly_suppliers','ly_ingredients','ly_prepared_items','ly_products','ly_recipe_items','ly_inventory'],
    documents:['ly_import_receipts','ly_import_items','ly_export_receipts','ly_export_items','ly_stocktake_receipts','ly_stocktake_items'],
    sales:['ly_sales','ly_sale_items'],ledger:['ly_stock_transactions'],cashflow:['ly_cashflow_entries']
  };
  const TABLE_DOMAIN=new Map(Object.entries(DOMAINS).flatMap(([domain,tables])=>tables.map(table=>[table,domain])));
  const VIBE_ONLY=location.hostname.endsWith('.tinhgon.xyz');
  const state={enabled:true,source:VIBE_ONLY?'vibe':'supabase',lastSnapshotAt:0,lastError:'',bypassUntil:0,pending:new Map(),domains:new Map(),versions:new Map()};
  let generation=0;

  function captureVersions(tables){
    for(const [table,rows] of Object.entries(tables||{}))for(const row of rows||[]){
      if(row?.id&&row?.updated_at)state.versions.set(`${table}:${row.id}`,String(row.updated_at));
    }
  }

  function compare(left,right){
    if(left===right)return 0;
    if(left==null)return -1;
    if(right==null)return 1;
    const leftTime=typeof left==='string'&&/^\d{4}-\d\d-\d\d[T ]/.test(left)?Date.parse(left):NaN;
    const rightTime=typeof right==='string'&&/^\d{4}-\d\d-\d\d[T ]/.test(right)?Date.parse(right):NaN;
    if(Number.isFinite(leftTime)&&Number.isFinite(rightTime))return leftTime-rightTime;
    return String(left).localeCompare(String(right),'vi',{numeric:true,sensitivity:'base'});
  }
  function ordered(rows,column,ascending){
    const copy=Array.isArray(rows)?rows.slice():[];
    if(column)copy.sort((a,b)=>(ascending===false?-1:1)*compare(a?.[column],b?.[column]));
    return copy;
  }
  async function domainSnapshot(orgId,domain){
    for(let refresh=0;refresh<3;refresh++){
      const cached=state.domains.get(domain);
      if(cached?.orgId===orgId&&Date.now()-cached.loadedAt<60_000)return cached;
      let entry=state.pending.get(domain);
      if(!entry||entry.orgId!==orgId||entry.generation!==generation){
        entry={orgId,domain,generation,promise:null};
        entry.promise=(async()=>{
          let response;
          for(let attempt=0;attempt<3;attempt++){
            const controller=typeof AbortController==='function'?new AbortController():null;
            const timeout=controller?setTimeout(()=>controller.abort(),15000):null;
            const revision=cached?.orgId===orgId?cached.revision:-1;
            try{response=await fetch(`/api/v1/domains/${domain}?org_id=${encodeURIComponent(orgId)}&revision=${encodeURIComponent(revision)}`,{cache:'no-store',credentials:'same-origin',...(controller?{signal:controller.signal}:{})});}
            finally{if(timeout!==null)clearTimeout(timeout);}
            if(response.ok||![502,503,504].includes(response.status))break;
            if(attempt<2)await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
          }
          if(!response.ok)throw new Error(`domain-${domain}-${response.status}`);
          const payload=await response.json();
          const tables=DOMAINS[domain];
          if(payload?.orgId!==orgId||payload?.domain!==domain||(!payload.notModified&&(!payload?.tables||tables.some(table=>!Array.isArray(payload.tables[table])))))throw new Error('invalid-domain');
          const next=payload.notModified&&cached?{...cached,loadedAt:Date.now()}:{...payload,loadedAt:Date.now()};
          if(entry.generation!==generation||String(window.__lyFreshOrgId||'')!==orgId)return payload;
          captureVersions(next.tables);
          state.domains.set(domain,next);
          state.lastSnapshotAt=Date.now();
          state.source='vibe';
          state.lastError='';
          return next;
        })().finally(()=>{if(state.pending.get(domain)===entry)state.pending.delete(domain);});
        state.pending.set(domain,entry);
      }
      const payload=await entry.promise;
      if(String(window.__lyFreshOrgId||'')!==orgId)throw new Error('snapshot-organization-changed');
      if(entry.generation===generation)return payload;
    }
    throw new Error('snapshot-invalidated');
  }
  function install(){
    const original=window.lyFreshFetch;
    if(typeof original!=='function'||original.__lyVibeWrapped)return false;
    async function cachedFetch(table,orderColumn=null,ascending=true){
      const orgId=String(window.__lyFreshOrgId||'');
      if(!state.enabled||!TABLE_DOMAIN.has(table)||!orgId||(!VIBE_ONLY&&Date.now()<state.bypassUntil)){
        state.source='supabase';
        return original(table,orderColumn,ascending);
      }
      const domain=TABLE_DOMAIN.get(table);
      try{return ordered((await domainSnapshot(orgId,domain)).tables[table],orderColumn,ascending);}
      catch(error){
        state.lastError=String(error?.message||error).slice(0,80);
        if(VIBE_ONLY){state.source='vibe';const cached=state.domains.get(domain);if(cached?.orgId===orgId&&String(window.__lyFreshOrgId||'')===orgId)return ordered(cached.tables?.[table],orderColumn,ascending);throw error;}
        state.source='supabase';
        state.bypassUntil=Date.now()+30_000;
        return original(table,orderColumn,ascending);
      }
    }
    cachedFetch.__lyVibeWrapped=true;
    cachedFetch.__lyOriginal=original;
    window.lyFreshFetch=cachedFetch;
    return true;
  }
  window.addEventListener('latyen:change-signal',()=>{
    generation+=1;
    state.domains.clear();
    state.pending.clear();
    state.versions.clear();
    state.lastSnapshotAt=0;
    state.bypassUntil=VIBE_ONLY?0:Date.now()+45_000;
  });
  window.__lyVibeReadCache={version:VERSION,install,rows:table=>{const cached=state.domains.get(TABLE_DOMAIN.get(table));return cached?.orgId===String(window.__lyFreshOrgId||'')?cached.tables?.[table]||[]:[];},versionFor:(table,id)=>id?state.versions.get(`${table}:${id}`):undefined,status:()=>({...state,pending:state.pending.size,domains:[...state.domains.keys()],versions:state.versions.size}),enable(value=true){state.enabled=!!value;}};
  if(!install()){
    let attempts=0;
    const retry=()=>{attempts+=1;if(!install()&&attempts<100)setTimeout(retry,50);};retry();
  }
})();
