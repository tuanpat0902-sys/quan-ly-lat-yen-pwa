(()=>{
  'use strict';
  if(window.__lyFreshCoreV3ShadowSoakV1)return;
  window.__lyFreshCoreV3ShadowSoakV1=true;

  const VERSION='2026.08.27.1';
  const STORAGE_KEY='lat_yen_v3_master_data_shadow_soak_v1';
  const MIN_INTERVAL_MS=24*60*60*1000;
  const state={
    version:VERSION,
    phase:'idle',
    runs:0,
    skips:0,
    lastAt:0,
    lastDurationMs:0,
    lastOrgId:'',
    parityReady:null,
    lastError:'',
    writes:0,
    reads:0
  };
  let running=false;

  const now=()=>Date.now();
  const currentSupabase=()=>{try{return window.sb?.auth?window.sb:null;}catch(_){return null;}};
  const currentV2=()=>window.__lyFreshCoreV2||null;
  const currentOrgId=()=>String(currentV2()?.store?.getState?.()?.orgId||window.__lyFreshOrgId||'');

  function readLocal(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch(_){return {};}
  }
  function saveLocal(value){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch(_){}
  }
  function eligible(orgId){
    if(!orgId||document.hidden||navigator.onLine===false)return false;
    const saved=readLocal(),last=Number(saved?.orgs?.[orgId]?.lastAt||0);
    return !last||now()-last>=MIN_INTERVAL_MS;
  }
  function record(orgId,result){
    const saved=readLocal(),orgs=saved.orgs&&typeof saved.orgs==='object'?saved.orgs:{};
    orgs[orgId]={
      lastAt:state.lastAt,
      durationMs:state.lastDurationMs,
      parityReady:!!result?.parityReady,
      warehouses:result?.parity?.warehouses??null,
      suppliers:result?.parity?.suppliers??null,
      reads:2,
      writes:0,
      v3Version:window.__lyFreshCoreV3Soak?.version||'3.0.0-shadow.1'
    };
    saveLocal({version:1,orgs});
  }

  async function run(reason='idle'){
    if(running)return false;
    const client=currentSupabase(),v2=currentV2(),orgId=currentOrgId();
    if(!client||!v2?.authoritative||!orgId){state.skips++;state.phase='waiting-v2';return false;}
    if(!eligible(orgId)){state.skips++;state.phase='throttled';return false;}
    running=true;state.phase='loading';state.lastError='';
    const started=now();
    try{
      const mod=await import('./src-v3/app/bootstrap.js?v=20260827.1');
      const core=mod.createFreshCoreV3({
        supabase:client,
        v2Runtime:v2,
        getOrgId:()=>orgId,
        initialState:{orgId,activePanel:v2.store?.getState?.()?.activePanel||'ingredients'}
      });
      core.setOrg(orgId);
      const instance=await core.features.activate('master-data',{
        gateway:core.gateway,
        cache:core.cache,
        events:core.events,
        v2Adapter:core.v2,
        getOrgId:()=>orgId
      });
      const result=await instance.refreshShadow();
      state.runs++;state.reads+=2;state.writes=0;state.lastAt=now();
      state.lastDurationMs=state.lastAt-started;state.lastOrgId=orgId;
      state.parityReady=!!result.parityReady;state.phase=result.parityReady?'parity-ready':'mismatch';
      window.__lyFreshCoreV3Soak=core;
      record(orgId,result);
      window.dispatchEvent?.(new CustomEvent('latyen:v3-master-data-soak',{
        detail:{reason,orgId,parityReady:!!result.parityReady,durationMs:state.lastDurationMs}
      }));
      return result.parityReady===true;
    }catch(error){
      state.phase='error';state.lastError=String(error?.message||error||'V3 shadow soak failed');
      return false;
    }finally{running=false;}
  }

  function schedule(){
    const launch=()=>run('idle');
    if(typeof requestIdleCallback==='function')requestIdleCallback(launch,{timeout:5000});
    else setTimeout(launch,2500);
  }

  window.__lyFreshCoreV3ShadowSoak={
    version:VERSION,
    run,
    status:()=>({...state,policy:{readOnly:true,maxRunsPerDay:1,cloudWrites:0}})
  };

  window.addEventListener?.('latyen:fresh-core-v2-authoritative',schedule,{once:true});
  window.addEventListener?.('latyen:v2-shadow-ready',schedule,{once:true});
  window.addEventListener?.('online',schedule,{once:true});
  if(currentV2()?.authoritative)schedule();
})();
