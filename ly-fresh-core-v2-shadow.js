(()=>{
  'use strict';
  if(window.__lyFreshCoreV2ShadowV3)return;
  window.__lyFreshCoreV2ShadowV3=true;

  const VERSION='2026.08.24.3';
  const MAX_WAIT_MS=60000;
  const STARTED_AT=Date.now();
  const state={version:VERSION,phase:'waiting',startedAt:STARTED_AT,readyAt:0,refreshAt:0,error:'',orgId:'',counts:{},coreVersion:'',attempts:0,contextSource:''};
  let contextPromise=null;

  function legacySupabase(){try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}return window.sb||null;}
  function legacyOrgId(){try{if(typeof v261OrganizationId!=='undefined'&&v261OrganizationId)return String(v261OrganizationId);}catch(e){}return String(window.__lyFreshOrgId||'');}
  function legacySession(){try{if(typeof v260Session!=='undefined'&&v260Session)return v260Session;}catch(e){}return window.__lyFreshSession||null;}
  async function resolveContext(client){
    let orgId=legacyOrgId();let session=legacySession();
    if(orgId)return {orgId,session,source:'legacy'};
    if(contextPromise)return contextPromise;
    contextPromise=(async()=>{
      try{
        if(!session&&client?.auth?.getSession){const {data,error}=await client.auth.getSession();if(error)throw error;session=data?.session||null;if(session)window.__lyFreshSession=session;}
        if(!session)return {orgId:'',session:null,source:'no-session'};
        if(client?.rpc){const {data,error}=await client.rpc('ly_bootstrap');if(error)throw error;orgId=String(data?.organization_id||data?.org_id||data||'');}
        if(orgId){window.__lyFreshOrgId=orgId;try{window.v261OrganizationId=orgId;}catch(e){}return {orgId,session,source:'direct-ly-bootstrap'};}
        return {orgId:'',session,source:'bootstrap-empty'};
      }finally{contextPromise=null;}
    })();
    return contextPromise;
  }
  function summarize(core){const s=core.store.getState();return {ingredients:Array.isArray(s.ingredients)?s.ingredients.length:0,preparedItems:Array.isArray(s.preparedItems)?s.preparedItems.length:0,products:Array.isArray(s.products)?s.products.length:0,recipeItems:Array.isArray(s.recipeItems)?s.recipeItems.length:0,imports:Array.isArray(s.importsData?.receipts)?s.importsData.receipts.length:0,importItems:Array.isArray(s.importsData?.items)?s.importsData.items.length:0,exports:Array.isArray(s.exportsData?.receipts)?s.exportsData.receipts.length:0,exportItems:Array.isArray(s.exportsData?.items)?s.exportsData.items.length:0,stocktakes:Array.isArray(s.stocktakeData?.receipts)?s.stocktakeData.receipts.length:0,stocktakeItems:Array.isArray(s.stocktakeData?.items)?s.stocktakeData.items.length:0,sales:Array.isArray(s.salesData?.sales)?s.salesData.sales.length:0,saleItems:Array.isArray(s.salesData?.items)?s.salesData.items.length:0,cashflow:Array.isArray(s.cashflowEntries)?s.cashflowEntries.length:0};}
  async function boot(){
    state.attempts++;
    if(document.hidden||!navigator.onLine){schedule(3000);return;}
    const client=legacySupabase();
    if(!client){if(Date.now()-STARTED_AT<MAX_WAIT_MS)schedule(1000);else{state.phase='idle-no-context';state.error='Supabase client not ready';}return;}
    state.phase='resolving-context';
    try{
      const context=await resolveContext(client);const orgId=String(context.orgId||'');state.contextSource=context.source||'';
      if(!orgId){if(Date.now()-STARTED_AT<MAX_WAIT_MS){state.phase='waiting-context';schedule(1200);}else{state.phase='idle-no-context';state.error='Organization context not ready';}return;}
      state.phase='loading';state.orgId=orgId;
      const mod=await import('./src-v2/bootstrap.js?v=20260824.3');
      const core=mod.createFreshCoreV2({supabase:client,getOrgId:()=>String(window.__lyFreshOrgId||orgId)});core.setOrg(orgId);if(context.session)core.setSession(context.session);window.__lyFreshCoreV2=core;state.coreVersion=core.version;state.readyAt=Date.now();state.phase='refreshing';await core.refreshCoreDomains();state.counts=summarize(core);state.refreshAt=Date.now();state.phase='ready';state.error='';window.dispatchEvent(new CustomEvent('latyen:v2-shadow-ready',{detail:{version:VERSION,coreVersion:core.version,orgId,counts:{...state.counts}}}));
    }catch(error){state.phase='error';state.error=String(error?.message||error||'Unknown shadow error');console.warn('[Lát Yên] Fresh Core V2 shadow',error);if(Date.now()-STARTED_AT<MAX_WAIT_MS)schedule(1800);}
  }
  function schedule(delay=1200){setTimeout(boot,Math.max(250,Number(delay)||1200));}
  function start(){const task=()=>boot();if('requestIdleCallback' in window)requestIdleCallback(task,{timeout:1500});else setTimeout(task,250);}
  window.__lyFreshCoreV2Shadow={version:VERSION,refresh:async()=>{const core=window.__lyFreshCoreV2;if(!core)return boot();state.phase='refreshing';try{await core.refreshCoreDomains();state.counts=summarize(core);state.refreshAt=Date.now();state.phase='ready';state.error='';}catch(error){state.phase='error';state.error=String(error?.message||error);throw error;}return {...state.counts};},status:()=>({...state,counts:{...state.counts}})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();