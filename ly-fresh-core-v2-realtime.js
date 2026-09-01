(()=>{
  'use strict';
  if(window.__lyFreshCoreV2RealtimeV1)return;
  window.__lyFreshCoreV2RealtimeV1=true;

  const VERSION='2026.09.01.1';
  const MAX_WAIT_MS=60000;
  const STARTED_AT=Date.now();
  const DEBOUNCE_MS=260;
  const FRESH_SHADOW_MS=5000;
  const TABLE_DOMAIN={
    ly_warehouses:'masterData',ly_suppliers:'masterData',ly_ingredients:'ingredients',ly_prepared_items:'ingredients',
    ly_products:'products',ly_recipe_items:'products',ly_inventory:'inventory',ly_stock_transactions:'inventory',
    ly_import_receipts:'imports',ly_import_items:'imports',ly_export_receipts:'exports',ly_export_items:'exports',
    ly_stocktake_receipts:'stocktake',ly_stocktake_items:'stocktake',ly_sales:'sales',ly_sale_items:'sales',
    ly_cashflow_entries:'cashflow'
  };

  const state={version:VERSION,phase:'waiting',enabled:false,connected:false,events:0,batches:0,coalescedEvents:0,refreshes:0,projections:0,deferredProjections:0,deferredRenders:0,projectionErrors:0,catchups:0,catchupSkips:0,catchupErrors:0,errors:0,lastTable:'',lastDomain:'',lastAt:0,lastCatchupAt:0,lastError:''};
  let channel=null;
  let batchTimer=null;
  let projectionTimer=null;
  let pendingProjectionReason='';
  let catchupPromise=null;
  const pendingDomains=new Map();

  function legacySupabase(){try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}return window.sb||null;}
  function orgId(){try{if(typeof v261OrganizationId!=='undefined'&&v261OrganizationId)return String(v261OrganizationId);}catch(e){}return String(window.__lyFreshOrgId||'');}
  function core(){return window.__lyFreshCoreV2||null;}

  function draftActive(){
    try{if(window.__lyFormDraftGuard?.isActive?.()===true)return true;}catch(e){}
    try{return window.v240HasActiveDraft?.()===true;}catch(e){return false;}
  }

  function scheduleProjection(reason){
    pendingProjectionReason=reason||pendingProjectionReason||'deferred';
    clearTimeout(projectionTimer);
    projectionTimer=setTimeout(()=>{
      projectionTimer=null;
      const next=pendingProjectionReason;
      if(!next)return;
      if(draftActive()){
        window.v240MarkProjectionDeferred?.();
        scheduleProjection(next);
        return;
      }
      pendingProjectionReason='';
      projectLegacy(`deferred:${next}`);
    },700);
  }

  function renderVisiblePanel(){
    if(draftActive()){state.deferredRenders++;return false;}
    const safe=typeof window.v235RequestBackgroundRender==='function'?window.v235RequestBackgroundRender:typeof window.v219SafeBackgroundRender==='function'?window.v219SafeBackgroundRender:null;
    if(safe){const rendered=safe();if(rendered===false)state.deferredRenders++;return true;}
    if(typeof window.renderAll==='function'){window.renderAll();return true;}
    for(const name of ['renderDashboard','renderIngredients','renderImports','renderStocktake','renderSales','renderCashflow'])try{window[name]?.();}catch(e){}
    return true;
  }

  function projectLegacy(reason){
    const current=core(),bridge=window.__lyFreshCoreV2LegacyHydration;
    if(!current?.store?.getState||typeof bridge?.hydrate!=='function')return false;
    if(draftActive()){
      state.deferredProjections++;
      window.v240MarkProjectionDeferred?.();
      scheduleProjection(reason);
      current.events?.emit?.('realtime:legacy-projection-deferred',{reason,at:Date.now()});
      return true;
    }
    try{
      if(bridge.hydrate(current.store.getState())!==true)return false;
      renderVisiblePanel();
      state.projections++;
      pendingProjectionReason='';
      state.lastError='';
      window.v240ClearDeferredStatus?.();
      current.events?.emit?.('realtime:legacy-projected',{reason,at:Date.now()});
      return true;
    }catch(error){
      state.projectionErrors++;
      state.lastError=String(error?.message||error||'Realtime projection failed');
      console.warn('[Lát Yên] V2 realtime projection',error);
      return false;
    }
  }

  async function flushBatch(){
    if(batchTimer){clearTimeout(batchTimer);batchTimer=null;}
    if(!pendingDomains.size)return false;
    const queued=[...pendingDomains.entries()];
    pendingDomains.clear();
    const current=core();
    if(!current)return false;
    state.batches++;
    const results=await Promise.allSettled(queued.map(async([domain,tables])=>{
      const refresh=current.domains?.[domain]?.refresh;
      if(typeof refresh!=='function')return false;
      await refresh();
      state.refreshes++;
      current.events?.emit?.('realtime:domain-refreshed',{domain,tables:[...tables],at:Date.now()});
      return true;
    }));
    const failures=results.filter(result=>result.status==='rejected');
    if(failures.length){
      state.errors+=failures.length;
      state.lastError=String(failures[0].reason?.message||failures[0].reason||'Realtime batch refresh failed');
      console.warn('[Lát Yên] V2 realtime batch',failures[0].reason);
    }
    const refreshed=results.some(result=>result.status==='fulfilled'&&result.value===true);
    if(refreshed)projectLegacy(`batch:${queued.map(([domain])=>domain).join(',')}`);
    return refreshed;
  }

  function schedule(domain,table){
    state.events++;
    state.lastTable=table;
    state.lastDomain=domain;
    state.lastAt=Date.now();
    if(pendingDomains.size||batchTimer)state.coalescedEvents++;
    if(!pendingDomains.has(domain))pendingDomains.set(domain,new Set());
    pendingDomains.get(domain).add(table);
    if(batchTimer)clearTimeout(batchTimer);
    batchTimer=setTimeout(()=>{flushBatch().catch(error=>{state.errors++;state.lastError=String(error?.message||error||'Realtime batch failed');});},DEBOUNCE_MS);
  }

  function freshShadow(){
    const shadow=window.__lyFreshCoreV2Shadow?.status?.()||{};
    return shadow.phase==='ready'&&Number(shadow.refreshAt||0)>0&&Date.now()-Number(shadow.refreshAt)<FRESH_SHADOW_MS;
  }

  async function catchUp(reason='subscribed'){
    if(catchupPromise)return catchupPromise;
    const current=core();
    if(typeof current?.refreshCoreDomains!=='function')return null;
    const run=(async()=>{
      try{
        if(reason==='initial-subscribed'&&freshShadow()){
          state.catchupSkips++;
          projectLegacy('catchup:initial-shadow');
        }else{
          await current.refreshCoreDomains();
          projectLegacy(`catchup:${reason}`);
        }
        state.catchups++;
        state.lastCatchupAt=Date.now();
        state.lastError='';
        current.events?.emit?.('realtime:catchup-complete',{reason,at:state.lastCatchupAt,skipped:reason==='initial-subscribed'&&state.catchupSkips>0});
        return true;
      }catch(error){
        state.catchupErrors++;
        state.lastError=String(error?.message||error||'Realtime catch-up failed');
        console.warn('[Lát Yên] V2 realtime catch-up',error);
        current.events?.emit?.('realtime:catchup-error',{reason,error:state.lastError,at:Date.now()});
        return false;
      }
    })();
    catchupPromise=run;
    try{return await run;}finally{if(catchupPromise===run)catchupPromise=null;}
  }

  function enable(){
    if(state.enabled)return true;
    const client=legacySupabase(),id=orgId(),current=core();
    if(!client||!id||!current||typeof client.channel!=='function')return false;
    let next=client.channel(`latyen-v2-domain-${id}`);
    for(const [table,domain] of Object.entries(TABLE_DOMAIN))next=next.on('postgres_changes',{event:'*',schema:'public',table,filter:`org_id=eq.${id}`},()=>schedule(domain,table));
    channel=next.subscribe(statusValue=>{
      const wasConnected=state.connected;
      state.connected=statusValue==='SUBSCRIBED';
      state.phase=state.connected?'active':String(statusValue||'connecting').toLowerCase();
      current.store?.patch?.({connectivity:{...(current.store.getState()?.connectivity||{}),online:navigator.onLine,realtime:state.connected}},{source:'realtime'});
      current.events?.emit?.('realtime:status',{status:statusValue,connected:state.connected});
      try{window.dispatchEvent?.(new CustomEvent('latyen:v2-realtime-status',{detail:{status:statusValue,connected:state.connected,phase:state.phase}}));}catch(e){}
      if(state.connected&&!wasConnected)catchUp(state.catchups?'reconnected':'initial-subscribed');
    });
    state.enabled=true;
    state.phase='connecting';
    return true;
  }

  function disable(){
    if(batchTimer)clearTimeout(batchTimer);
    if(projectionTimer)clearTimeout(projectionTimer);
    batchTimer=null;
    projectionTimer=null;
    pendingProjectionReason='';
    pendingDomains.clear();
    const client=legacySupabase();
    if(client&&channel)try{client.removeChannel(channel);}catch(e){}
    channel=null;
    state.enabled=false;
    state.connected=false;
    state.phase='disabled';
  }

  function boot(){if(enable())return;if(Date.now()-STARTED_AT>=MAX_WAIT_MS){state.phase='idle-no-context';return;}setTimeout(boot,500);}

  window.__lyFreshCoreV2Realtime={version:VERSION,enable,disable,catchUp,flush:flushBatch,flushProjection:()=>projectLegacy(pendingProjectionReason||'manual'),status:()=>({...state,pendingProjection:pendingProjectionReason}),tableDomain:()=>({...TABLE_DOMAIN})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
