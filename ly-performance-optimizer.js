(()=>{
  'use strict';
  if(window.__lyPerformanceOptimizerV1)return;
  window.__lyPerformanceOptimizerV1=true;

  const VERSION='2026.08.23.1';
  const LIVE_MS=30000;
  const FALLBACK_MS=8000;
  const HIDDEN_MS=90000;
  const OFFLINE_MS=15000;
  const state={timer:null,running:false,lastRunAt:0,lastReason:'',cycles:0,errors:0};

  function realtimeLive(){
    try{
      const ch=window.__lyFreshRealtime;
      const s=String(ch?.state||ch?.joinedOnce||'').toLowerCase();
      if(s==='joined'||s==='true')return true;
      const cloud=document.getElementById('cloudStatus');
      const raw=String(cloud?.title||cloud?.getAttribute?.('aria-label')||'').toLowerCase();
      return raw.includes('realtime')&&!/gián đoạn|offline|mất kết nối|lỗi/.test(raw);
    }catch(e){return false;}
  }

  function nextDelay(){
    if(!navigator.onLine)return OFFLINE_MS;
    if(document.hidden)return HIDDEN_MS;
    return realtimeLive()?LIVE_MS:FALLBACK_MS;
  }

  function clearLegacy(){
    try{if(typeof v268HeartbeatTimer!=='undefined'&&v268HeartbeatTimer){clearInterval(v268HeartbeatTimer);v268HeartbeatTimer=null;}}catch(e){}
    try{if(typeof v269SyncTimer!=='undefined'&&v269SyncTimer){clearInterval(v269SyncTimer);v269SyncTimer=null;}}catch(e){}
  }

  function schedule(delay=nextDelay()){
    clearTimeout(state.timer);
    state.timer=setTimeout(run,Math.max(1000,Number(delay)||nextDelay()));
  }

  async function run(reason='adaptive'){
    clearLegacy();
    if(state.running){schedule();return;}
    if(!window.__lyFreshOrgId||!navigator.onLine||document.hidden){schedule();return;}
    if(typeof v269SyncCycle!=='function'){schedule(3000);return;}
    state.running=true;state.lastReason=reason;state.lastRunAt=Date.now();state.cycles++;
    try{await v269SyncCycle({forcePull:false,reason:'adaptive_scheduler'});}catch(e){state.errors++;console.warn('[Lát Yên] adaptive sync',e);}finally{state.running=false;schedule();}
  }

  function start(){
    clearLegacy();
    try{v268StartCloudHeartbeat=()=>{clearLegacy();schedule(1200);};}catch(e){}
    try{v269StartSyncEngine=()=>{clearLegacy();schedule(1200);};}catch(e){}
    schedule(1800);
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){schedule(HIDDEN_MS);return;}
    schedule(500);
  });
  window.addEventListener('online',()=>schedule(300));
  window.addEventListener('offline',()=>schedule(OFFLINE_MS));
  window.addEventListener('beforeunload',()=>clearTimeout(state.timer),{once:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

  window.__lyPerformanceOptimizer={
    version:VERSION,
    refresh:()=>schedule(250),
    runNow:()=>run('manual'),
    status:()=>({version:VERSION,realtime:realtimeLive(),nextMs:nextDelay(),running:state.running,lastRunAt:state.lastRunAt,lastReason:state.lastReason,cycles:state.cycles,errors:state.errors})
  };
})();
