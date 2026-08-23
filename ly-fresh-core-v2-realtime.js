(()=>{
  'use strict';
  if(window.__lyFreshCoreV2RealtimeV1)return;
  window.__lyFreshCoreV2RealtimeV1=true;

  const VERSION='2026.08.23.1';
  const MAX_WAIT_MS=60000;
  const STARTED_AT=Date.now();
  const DEBOUNCE_MS=180;
  const TABLE_DOMAIN={
    ly_ingredients:'ingredients',
    ly_prepared_items:'ingredients',
    ly_products:'products',
    ly_recipe_items:'products',
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

  const state={version:VERSION,phase:'waiting',enabled:false,connected:false,events:0,refreshes:0,errors:0,lastTable:'',lastDomain:'',lastAt:0,lastError:''};
  let channel=null;
  const timers=new Map();

  function legacySupabase(){try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}return window.sb||null;}
  function orgId(){try{if(typeof v261OrganizationId!=='undefined'&&v261OrganizationId)return String(v261OrganizationId);}catch(e){}return String(window.__lyFreshOrgId||'');}
  function core(){return window.__lyFreshCoreV2||null;}

  function schedule(domain,table){
    state.events++;
    state.lastTable=table;
    state.lastDomain=domain;
    state.lastAt=Date.now();
    clearTimeout(timers.get(domain));
    timers.set(domain,setTimeout(async()=>{
      timers.delete(domain);
      const c=core();
      const refresh=c?.domains?.[domain]?.refresh;
      if(typeof refresh!=='function')return;
      try{
        await refresh();
        state.refreshes++;
        state.lastError='';
        c.events?.emit?.('realtime:domain-refreshed',{domain,table,at:Date.now()});
      }catch(error){
        state.errors++;
        state.lastError=String(error?.message||error||'Realtime refresh failed');
        console.warn('[Lát Yên] V2 realtime refresh',domain,error);
      }
    },DEBOUNCE_MS));
  }

  function enable(){
    if(state.enabled)return true;
    const client=legacySupabase(),id=orgId(),c=core();
    if(!client||!id||!c||typeof client.channel!=='function')return false;
    let ch=client.channel(`latyen-v2-domain-${id}`);
    for(const [table,domain] of Object.entries(TABLE_DOMAIN)){
      ch=ch.on('postgres_changes',{event:'*',schema:'public',table,filter:`org_id=eq.${id}`},()=>schedule(domain,table));
    }
    channel=ch.subscribe(status=>{
      state.connected=status==='SUBSCRIBED';
      state.phase=state.connected?'active':String(status||'connecting').toLowerCase();
      c.store?.patch?.({connectivity:{...(c.store.getState()?.connectivity||{}),online:navigator.onLine,realtime:state.connected}},{source:'realtime'});
      c.events?.emit?.('realtime:status',{status,connected:state.connected});
    });
    state.enabled=true;
    state.phase='connecting';
    return true;
  }

  function disable(){
    for(const timer of timers.values())clearTimeout(timer);
    timers.clear();
    const client=legacySupabase();
    if(client&&channel)try{client.removeChannel(channel);}catch(e){}
    channel=null;
    state.enabled=false;
    state.connected=false;
    state.phase='disabled';
  }

  function boot(){
    if(enable())return;
    if(Date.now()-STARTED_AT>=MAX_WAIT_MS){state.phase='idle-no-context';return;}
    setTimeout(boot,500);
  }

  window.__lyFreshCoreV2Realtime={version:VERSION,enable,disable,status:()=>({...state}),tableDomain:()=>({...TABLE_DOMAIN})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();