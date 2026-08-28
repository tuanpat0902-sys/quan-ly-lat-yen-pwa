(()=>{
  'use strict';
  if(window.__lyFreshCoreV3IngredientsInventorySoakV1)return;
  window.__lyFreshCoreV3IngredientsInventorySoakV1=true;

  const VERSION='2026.08.28.4';
  const STORAGE_KEY='lat_yen_v3_ingredients_inventory_shadow_soak_v1';
  const MIN_INTERVAL_MS=24*60*60*1000;
  const HISTORY_LIMIT=7;
  const PRODUCTION_SOURCE='device-local-production-soak';
  const EVIDENCE_VERSION=2;
  const state={
    version:VERSION,
    phase:'idle',
    runs:0,
    skips:0,
    reads:0,
    writes:0,
    lastAt:0,
    lastAttemptAt:0,
    nextRunAt:0,
    lastReason:'',
    lastDurationMs:0,
    lastOrgId:'',
    parityReady:null,
    complete:null,
    counts:{ingredients:0,inventory:0},
    lastError:'',
    gate:null
  };
  let running=false,retryTimer=null,idlePending=false;

  const now=()=>Date.now();
  const client=()=>{try{return window.sb?.auth?window.sb:null;}catch(_){return null;}};
  const v2=()=>window.__lyFreshCoreV2||null;
  const orgId=()=>String(v2()?.store?.getState?.()?.orgId||window.__lyFreshOrgId||'');

  function readLocal(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch(_){return {};}
  }
  function saveLocal(value){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch(_){}
  }
  function eligibility(id=orgId()){
    const saved=readLocal(),entry=id?saved?.orgs?.[id]:null;
    const lastAt=Number(entry?.lastAt||0),lastAttemptAt=Number(entry?.lastAttemptAt||0);
    const budgetAt=Math.max(lastAt,lastAttemptAt),retryAt=budgetAt?budgetAt+MIN_INTERVAL_MS:0;
    const visible=!document.hidden,online=navigator.onLine!==false,cooldown=!retryAt||now()>=retryAt;
    return Object.freeze({eligible:!!id&&visible&&online&&!running&&cooldown,orgId:id,lastAt,lastAttemptAt,retryAt,visible,online,cooldown});
  }
  function markAttempt(id){
    const saved=readLocal(),orgs=saved.orgs&&typeof saved.orgs==='object'?saved.orgs:{};
    const entry=orgs[id]&&typeof orgs[id]==='object'?orgs[id]:{};
    const lastAttemptAt=now();
    orgs[id]={...entry,lastAttemptAt,version:VERSION};
    saveLocal({version:EVIDENCE_VERSION,orgs});
    return lastAttemptAt;
  }
  function evidence(result){
    return {
      lastAt:state.lastAt,
      durationMs:state.lastDurationMs,
      parityReady:!!result?.parityReady,
      complete:!!result?.complete,
      counts:result?.counts||{},
      reads:2,
      writes:0,
      source:PRODUCTION_SOURCE,
      evidenceVersion:EVIDENCE_VERSION
    };
  }
  function record(id,result){
    const saved=readLocal(),orgs=saved.orgs&&typeof saved.orgs==='object'?saved.orgs:{};
    const history=Array.isArray(orgs[id]?.history)?orgs[id].history.slice(-HISTORY_LIMIT+1):[];
    const observation=evidence(result);
    history.push(observation);
    orgs[id]={
      ...(orgs[id]&&typeof orgs[id]==='object'?orgs[id]:{}),
      lastAt:state.lastAt,
      lastAttemptAt:state.lastAttemptAt,
      durationMs:state.lastDurationMs,
      parityReady:!!result?.parityReady,
      complete:!!result?.complete,
      counts:result?.counts||{},
      ingredients:result?.parity?.ingredients??null,
      inventory:result?.parity?.inventory??null,
      reads:2,
      writes:0,
      source:PRODUCTION_SOURCE,
      evidenceVersion:EVIDENCE_VERSION,
      history,
      gate:state.gate,
      version:VERSION
    };
    saveLocal({version:EVIDENCE_VERSION,orgs});
  }

  async function run(reason='idle'){
    if(running)return false;
    const supabase=client(),coreV2=v2(),id=orgId(),ready=eligibility(id);
    if(!supabase||!coreV2?.authoritative||!id){
      state.skips++;state.phase='waiting-v2';state.lastReason=reason;
      return false;
    }
    if(!ready.eligible){
      state.skips++;
      state.phase=!ready.visible?'waiting-visible':!ready.online?'offline':'cooldown';
      state.nextRunAt=ready.retryAt;state.lastReason=reason;
      if(ready.visible&&ready.online&&!ready.cooldown)arm('cooldown-expired');
      return false;
    }

    running=true;
    state.phase='loading';
    state.lastError='';
    state.lastReason=reason;
    state.lastAttemptAt=markAttempt(id);
    state.nextRunAt=state.lastAttemptAt+MIN_INTERVAL_MS;
    const started=now();

    try{
      const mod=await import('./src-v3/app/bootstrap.js?v=20260827.5');
      const core=mod.createFreshCoreV3({
        supabase,
        v2Runtime:coreV2,
        getOrgId:()=>id,
        initialState:{orgId:id,activePanel:coreV2.store?.getState?.()?.activePanel||'ingredients'}
      });
      core.setOrg(id);
      const instance=await core.features.activate('ingredients-inventory',{
        gateway:core.gateway,
        cache:core.cache,
        events:core.events,
        v2Adapter:core.v2
      });
      const result=await instance.refreshControlledShadow();
      const gateMod=await import('./src-v3/domains/ingredients-inventory/migration-gate.js?v=20260828.2');

      state.runs++;
      state.reads+=2;
      state.writes=0;
      state.lastAt=now();
      state.lastDurationMs=state.lastAt-started;
      state.lastOrgId=id;
      state.parityReady=!!result.parityReady;
      state.complete=!!result.complete;
      state.counts={...result.counts};
      const savedBefore=readLocal();
      const historyBefore=Array.isArray(savedBefore?.orgs?.[id]?.history)?savedBefore.orgs[id].history:[];
      const observation=evidence(result);
      state.gate=gateMod.evaluateIngredientsInventoryMigrationGate([...historyBefore,observation]);
      state.phase=!result.complete?'capacity-guard':result.parityReady?(state.gate.pass?'candidate-ready':'parity-ready'):'mismatch';

      record(id,result);
      window.dispatchEvent?.(new CustomEvent('latyen:v3-ingredients-inventory-soak',{
        detail:{reason,orgId:id,parityReady:!!result.parityReady,complete:!!result.complete,counts:{...result.counts},durationMs:state.lastDurationMs}
      }));
      core.destroy?.();
      return result.parityReady===true;
    }catch(error){
      state.phase='error';
      state.lastError=String(error?.message||error||'V3 Ingredients + Inventory shadow soak failed');
      return false;
    }finally{
      running=false;
      arm('next-eligible');
    }
  }

  function schedule(reason='idle'){
    if(idlePending||running)return false;
    idlePending=true;state.lastReason=reason;
    const launch=()=>{idlePending=false;run(reason);};
    if(typeof requestIdleCallback==='function')requestIdleCallback(launch,{timeout:6000});
    else setTimeout(launch,3000);
    return true;
  }
  function arm(reason='timer'){
    if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}
    const ready=eligibility();
    state.nextRunAt=ready.retryAt;
    if(!ready.orgId||!ready.visible||!ready.online||running)return false;
    const delay=Math.max(0,ready.retryAt-now());
    if(delay>0){
      retryTimer=setTimeout(()=>{retryTimer=null;schedule(reason);},Math.min(delay+1000,2147483647));
      return true;
    }
    return schedule(reason);
  }

  window.__lyFreshCoreV3IngredientsInventorySoak={
    version:VERSION,
    run,
    eligibility,
    status:()=>({...state,counts:{...state.counts},policy:{readOnly:true,maxRunsPerDay:1,minObservationIntervalMs:MIN_INTERVAL_MS,queriesPerRun:2,maxRowsPerDataset:500,cloudWrites:0,autoPromotion:false,rollbackTarget:'v2',source:PRODUCTION_SOURCE,evidenceVersion:EVIDENCE_VERSION,persistentScheduler:true,resumeEvents:['visibilitychange','pageshow','focus','online']}})
  };

  window.addEventListener?.('latyen:v2-shadow-ready',()=>arm('v2-ready'),{once:true});
  window.addEventListener?.('online',()=>arm('online'));
  document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)arm('visible');});
  window.addEventListener?.('pageshow',()=>arm('pageshow'));
  window.addEventListener?.('focus',()=>arm('focus'));
  arm('startup');
})();
