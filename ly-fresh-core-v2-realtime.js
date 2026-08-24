(()=>{
  'use strict';
  if(window.__lyFreshCoreV2RealtimeV1)return;
  window.__lyFreshCoreV2RealtimeV1=true;

  const VERSION='2026.08.24.5';
  const MAX_WAIT_MS=60000;
  const STARTED_AT=Date.now();
  const DEBOUNCE_MS=180;
  const TABLE_DOMAIN={
    ly_warehouses:'masterData',
    ly_suppliers:'masterData',
    ly_ingredients:'ingredients',
    ly_prepared_items:'ingredients',
    ly_products:'products',
    ly_recipe_items:'products',
    ly_inventory:'inventory',
    ly_stock_transactions:'inventory',
    ly_import_receipts:'imports',
    ly_import_items:'imports',
    ly_export_receipts:'exports',
    ly_export_items:'exports',
    ly_stocktake_receipts:'stocktake',
    ly_stocktake_items:'stocktake',
    ly_sales:'sales',
    ly_sale_items:'sales',
    ly_cashflow_entries:'cashflow'
  };

  const state={version:VERSION,phase:'waiting',enabled:false,connected:false,events:0,refreshes:0,projections:0,projectionErrors:0,catchups:0,catchupErrors:0,errors:0,lastTable:'',lastDomain:'',lastAt:0,lastCatchupAt:0,lastError:''};
  let channel=null;
  let catchupPromise=null;
  const timers=new Map();

  function legacySupabase(){try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}return window.sb||null;}
  function orgId(){try{if(typeof v261OrganizationId!=='undefined'&&v261OrganizationId)return String(v261OrganizationId);}catch(e){}return String(window.__lyFreshOrgId||'');}
  function core(){return window.__lyFreshCoreV2||null;}

  function projectLegacy(reason){
    const c=core(),bridge=window.__lyFreshCoreV2LegacyHydration;
    if(!c?.store?.getState||typeof bridge?.hydrate!=='function')return false;
    try{
      if(bridge.hydrate(c.store.getState())!==true)return false;
      if(typeof window.renderAll==='function')window.renderAll();
      else for(const name of ['renderDashboard','renderIngredients','renderImports','renderStocktake','renderSales','renderCashflow'])try{window[name]?.();}catch(e){}
      state.projections++;state.lastError='';
      c.events?.emit?.('realtime:legacy-projected',{reason,at:Date.now()});
      return true;
    }catch(error){state.projectionErrors++;state.lastError=String(error?.message||error||'Realtime projection failed');console.warn('[Lát Yên] V2 realtime projection',error);return false;}
  }

  function schedule(domain,table){
    state.events++;state.lastTable=table;state.lastDomain=domain;state.lastAt=Date.now();
    clearTimeout(timers.get(domain));
    timers.set(domain,setTimeout(async()=>{
      timers.delete(domain);
      const c=core(),refresh=c?.domains?.[domain]?.refresh;
      if(typeof refresh!=='function')return;
      try{await refresh();projectLegacy(`domain:${domain}`);state.refreshes++;state.lastError='';c.events?.emit?.('realtime:domain-refreshed',{domain,table,at:Date.now()});}
      catch(error){state.errors++;state.lastError=String(error?.message||error||'Realtime refresh failed');console.warn('[Lát Yên] V2 realtime refresh',domain,error);}
    },DEBOUNCE_MS));
  }

  async function catchUp(reason='subscribed'){
    if(catchupPromise)return catchupPromise;
    const c=core();
    if(typeof c?.refreshCoreDomains!=='function')return null;
    catchupPromise=(async()=>{
      try{
        await c.refreshCoreDomains();
        projectLegacy(`catchup:${reason}`);
        state.catchups++;
        state.lastCatchupAt=Date.now();
        state.lastError='';
        c.events?.emit?.('realtime:catchup-complete',{reason,at:state.lastCatchupAt});
        return true;
      }catch(error){
        state.catchupErrors++;
        state.lastError=String(error?.message||error||'Realtime catch-up failed');
        console.warn('[Lát Yên] V2 realtime catch-up',error);
        c.events?.emit?.('realtime:catchup-error',{reason,error:state.lastError,at:Date.now()});
        return false;
      }finally{catchupPromise=null;}
    })();
    return catchupPromise;
  }

  function enable(){
    if(state.enabled)return true;
    const client=legacySupabase(),id=orgId(),c=core();
    if(!client||!id||!c||typeof client.channel!=='function')return false;
    let ch=client.channel(`latyen-v2-domain-${id}`);
    for(const [table,domain] of Object.entries(TABLE_DOMAIN))ch=ch.on('postgres_changes',{event:'*',schema:'public',table,filter:`org_id=eq.${id}`},()=>schedule(domain,table));
    channel=ch.subscribe(status=>{
      const wasConnected=state.connected;
      state.connected=status==='SUBSCRIBED';state.phase=state.connected?'active':String(status||'connecting').toLowerCase();
      c.store?.patch?.({connectivity:{...(c.store.getState()?.connectivity||{}),online:navigator.onLine,realtime:state.connected}},{source:'realtime'});
      c.events?.emit?.('realtime:status',{status,connected:state.connected});
      if(state.connected&&!wasConnected)catchUp(state.catchups?'reconnected':'initial-subscribed');
    });
    state.enabled=true;state.phase='connecting';return true;
  }

  function disable(){for(const timer of timers.values())clearTimeout(timer);timers.clear();const client=legacySupabase();if(client&&channel)try{client.removeChannel(channel);}catch(e){}channel=null;state.enabled=false;state.connected=false;state.phase='disabled';}
  function boot(){if(enable())return;if(Date.now()-STARTED_AT>=MAX_WAIT_MS){state.phase='idle-no-context';return;}setTimeout(boot,500);}

  window.__lyFreshCoreV2Realtime={version:VERSION,enable,disable,catchUp,status:()=>({...state}),tableDomain:()=>({...TABLE_DOMAIN})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
