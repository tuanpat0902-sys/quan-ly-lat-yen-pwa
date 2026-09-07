(()=>{
  'use strict';
  const VERSION='2026.09.07.1';
  const TABLES=new Set([
    'ly_warehouses','ly_suppliers','ly_ingredients','ly_prepared_items',
    'ly_products','ly_recipe_items','ly_inventory','ly_import_receipts',
    'ly_import_items','ly_export_receipts','ly_export_items','ly_stocktake_receipts',
    'ly_stocktake_items','ly_sales','ly_sale_items','ly_stock_transactions','ly_cashflow_entries'
  ]);
  const VIBE_ONLY=location.hostname.endsWith('.tinhgon.xyz');
  const state={enabled:true,source:VIBE_ONLY?'vibe':'supabase',lastSnapshotAt:0,lastError:'',bypassUntil:0,pending:null,snapshot:null};

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
  async function accessToken(){
    const client=window.sb||window.supabaseClient||window.__lySupabaseClient;
    const result=await client?.auth?.getSession?.();
    return result?.data?.session?.access_token||'';
  }
  async function snapshot(orgId){
    if(state.snapshot?.orgId===orgId&&Date.now()-state.lastSnapshotAt<15_000)return state.snapshot;
    if(state.pending)return state.pending;
    state.pending=(async()=>{
      const response=await fetch(`/api/v1/snapshot?org_id=${encodeURIComponent(orgId)}`,{
        cache:'no-store',credentials:'same-origin'
      });
      if(!response.ok)throw new Error(`snapshot-${response.status}`);
      const payload=await response.json();
      if(payload?.orgId!==orgId||!payload?.tables)throw new Error('invalid-snapshot');
      state.snapshot=payload;
      state.lastSnapshotAt=Date.now();
      state.source='vibe';
      state.lastError='';
      return payload;
    })().finally(()=>{state.pending=null;});
    return state.pending;
  }
  function install(){
    const original=window.lyFreshFetch;
    if(typeof original!=='function'||original.__lyVibeWrapped)return false;
    async function cachedFetch(table,orderColumn=null,ascending=true){
      const orgId=String(window.__lyFreshOrgId||'');
      if(!state.enabled||!TABLES.has(table)||!orgId||Date.now()<state.bypassUntil){
        state.source='supabase';
        return original(table,orderColumn,ascending);
      }
      try{return ordered((await snapshot(orgId)).tables[table],orderColumn,ascending);}
      catch(error){
        state.lastError=String(error?.message||error).slice(0,80);
        if(VIBE_ONLY){state.source='vibe';throw error;}
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
    state.snapshot=null;
    state.lastSnapshotAt=0;
    state.bypassUntil=Date.now()+45_000;
  });
  window.__lyVibeReadCache={version:VERSION,install,status:()=>({...state,pending:!!state.pending,snapshot:undefined}),enable(value=true){state.enabled=!!value;}};
  if(!install()){
    let attempts=0;
    const timer=setInterval(()=>{attempts+=1;if(install()||attempts>=100)clearInterval(timer);},50);
  }
})();
