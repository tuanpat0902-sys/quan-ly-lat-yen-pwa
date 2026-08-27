(()=>{
  'use strict';
  if(window.__lyFreshCoreV3IngredientsInventoryValidationV1)return;
  window.__lyFreshCoreV3IngredientsInventoryValidationV1=true;

  const VERSION='2026.08.27.1';
  const STORAGE_KEY='lat_yen_v3_ingredients_inventory_validation_v1';
  const COOLDOWN_MS=24*60*60*1000;
  const ROUNDS=3;
  const DELAY_MS=750;
  const state={version:VERSION,phase:'idle',running:false,roundsCompleted:0,reads:0,writes:0,lastAt:0,lastDurationMs:0,lastOrgId:'',result:null,lastError:''};

  const now=()=>Date.now();
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const currentSupabase=()=>{try{return window.sb?.auth?window.sb:null;}catch(_){return null;}};
  const currentV2=()=>window.__lyFreshCoreV2||null;
  const currentOrgId=()=>String(currentV2()?.store?.getState?.()?.orgId||window.__lyFreshOrgId||'');

  function readLocal(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch(_){return {};}}
  function saveLocal(value){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch(_){}}
  function eligibility(){
    const id=currentOrgId(),saved=readLocal(),entry=id?saved?.orgs?.[id]:null,lastAt=Number(entry?.lastAt||0);
    return Object.freeze({eligible:!!id&&navigator.onLine!==false&&!state.running&&(!lastAt||now()-lastAt>=COOLDOWN_MS),orgId:id,lastAt,retryAt:lastAt?lastAt+COOLDOWN_MS:0});
  }
  function persist(orgId,result,durationMs,observations){
    const saved=readLocal(),orgs=saved.orgs&&typeof saved.orgs==='object'?saved.orgs:{};
    orgs[orgId]={lastAt:now(),durationMs,result,observations,reads:ROUNDS*2,writes:0,version:VERSION};
    saveLocal({version:1,orgs});
  }

  async function run(){
    if(state.running)return state.result;
    const ready=eligibility(),supabase=currentSupabase(),v2=currentV2();
    if(!ready.eligible||!supabase||!v2?.authoritative){
      state.phase=!ready.orgId||!v2?.authoritative?'waiting-v2':navigator.onLine===false?'offline':'cooldown';
      return null;
    }
    state.running=true;state.phase='running';state.roundsCompleted=0;state.reads=0;state.writes=0;state.lastError='';
    const started=now();
    let core=null;
    try{
      const [{createFreshCoreV3},validator]=await Promise.all([
        import('./src-v3/app/bootstrap.js?v=20260827.5'),
        import('./src-v3/domains/ingredients-inventory/accelerated-validation.js?v=20260827.1')
      ]);
      core=createFreshCoreV3({supabase,v2Runtime:v2,getOrgId:()=>ready.orgId,initialState:{orgId:ready.orgId,activePanel:v2.store?.getState?.()?.activePanel||'ingredients'}});
      core.setOrg(ready.orgId);
      const instance=await core.features.activate('ingredients-inventory',{gateway:core.gateway,cache:core.cache,events:core.events,v2Adapter:core.v2});
      const observations=[];
      for(let round=1;round<=ROUNDS;round++){
        const roundStarted=now();
        const result=await instance.refreshControlledShadow();
        observations.push(Object.freeze({round,lastAt:now(),durationMs:now()-roundStarted,parityReady:result.parityReady===true,complete:result.complete===true,reads:2,writes:0,counts:result.counts}));
        state.roundsCompleted=round;state.reads=round*2;
        if(round<ROUNDS)await sleep(DELAY_MS);
      }
      const result=validator.evaluateAcceleratedIngredientsInventoryValidation(observations);
      state.result=result;state.lastAt=now();state.lastDurationMs=state.lastAt-started;state.lastOrgId=ready.orgId;state.phase=result.pass?'pass':'fail';
      persist(ready.orgId,result,state.lastDurationMs,observations);
      window.dispatchEvent?.(new CustomEvent('latyen:v3-ingredients-inventory-validation',{detail:{orgId:ready.orgId,pass:result.pass,durationMs:state.lastDurationMs,reads:state.reads,writes:0}}));
      return result;
    }catch(error){
      state.phase='error';state.lastError=String(error?.message||error||'V3 validation failed');return null;
    }finally{
      try{core?.destroy?.();}catch(_){}
      state.running=false;
    }
  }

  window.__lyFreshCoreV3IngredientsInventoryValidation={
    version:VERSION,run,eligibility,
    status:()=>({...state,policy:{rounds:3,queriesPerRound:2,totalQueries:6,cloudWrites:0,cooldownHours:24,advisoryOnly:true,productionObservationCredit:0,autoPromotion:false}})
  };
})();