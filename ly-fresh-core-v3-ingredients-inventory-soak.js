(()=>{
  'use strict';
  if(window.__lyFreshCoreV3IngredientsInventorySoakV1)return;
  window.__lyFreshCoreV3IngredientsInventorySoakV1=true;

  const VERSION='2026.08.27.2';
  const STORAGE_KEY='lat_yen_v3_ingredients_inventory_shadow_soak_v1';
  const MIN_INTERVAL_MS=24*60*60*1000;
  const HISTORY_LIMIT=7;
  const state={
    version:VERSION,
    phase:'idle',
    runs:0,
    skips:0,
    reads:0,
    writes:0,
    lastAt:0,
    lastDurationMs:0,
    lastOrgId:'',
    parityReady:null,
    complete:null,
    counts:{ingredients:0,inventory:0},
    lastError:'',
    gate:null
  };
  let running=false;

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
  function eligible(id){
    if(!id||document.hidden||navigator.onLine===false)return false;
    const saved=readLocal(),last=Number(saved?.orgs?.[id]?.lastAt||0);
    return !last||now()-last>=MIN_INTERVAL_MS;
  }
  function record(id,result){
    const saved=readLocal(),orgs=saved.orgs&&typeof saved.orgs==='object'?saved.orgs:{};
    const history=Array.isArray(orgs[id]?.history)?orgs[id].history.slice(-HISTORY_LIMIT+1):[];
    const observation={
      lastAt:state.lastAt,
      durationMs:state.lastDurationMs,
      parityReady:!!result?.parityReady,
      complete:!!result?.complete,
      counts:result?.counts||{},
      reads:2,
      writes:0
    };
    history.push(observation);
    orgs[id]={
      lastAt:state.lastAt,
      durationMs:state.lastDurationMs,
      parityReady:!!result?.parityReady,
      complete:!!result?.complete,
      counts:result?.counts||{},
      ingredients:result?.parity?.ingredients??null,
      inventory:result?.parity?.inventory??null,
      reads:2,
      writes:0,
      history,
      gate:state.gate,
      version:VERSION
    };
    saveLocal({version:1,orgs});
  }

  async function run(reason='idle'){
    if(running)return false;
    const supabase=client(),coreV2=v2(),id=orgId();
    if(!supabase||!coreV2?.authoritative||!id){
      state.skips++;state.phase='waiting-v2';
      return false;
    }
    if(!eligible(id)){
      state.skips++;state.phase='throttled';
      return false;
    }

    running=true;
    state.phase='loading';
    state.lastError='';
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
      const gateMod=await import('./src-v3/domains/ingredients-inventory/migration-gate.js?v=20260827.1');

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
      const observation={lastAt:state.lastAt,durationMs:state.lastDurationMs,parityReady:!!result.parityReady,complete:!!result.complete,reads:2,writes:0};
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
    }
  }

  function schedule(){
    const launch=()=>run('idle');
    if(typeof requestIdleCallback==='function')requestIdleCallback(launch,{timeout:6000});
    else setTimeout(launch,3000);
  }

  window.__lyFreshCoreV3IngredientsInventorySoak={
    version:VERSION,
    run,
    status:()=>({...state,counts:{...state.counts},policy:{readOnly:true,maxRunsPerDay:1,queriesPerRun:2,maxRowsPerDataset:500,cloudWrites:0,autoPromotion:false,rollbackTarget:'v2'}})
  };

  window.addEventListener?.('latyen:v2-shadow-ready',schedule,{once:true});
  window.addEventListener?.('online',schedule,{once:true});
  if(v2()?.authoritative)schedule();
})();