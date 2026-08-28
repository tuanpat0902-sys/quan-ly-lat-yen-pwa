const MAX_DURATION_MS=5000;
const REQUIRED_CONSECUTIVE_PASSES=3;
const REQUIRED_READS_PER_RUN=2;
const MIN_OBSERVATION_INTERVAL_MS=24*60*60*1000;
const PRODUCTION_SOURCE='device-local-production-soak';

function healthy(item){
  return Object.freeze({
    parity:item?.parityReady===true,
    complete:item?.complete===true,
    zeroWrites:Number(item?.writes||0)===0,
    boundedReads:Number(item?.reads||0)===REQUIRED_READS_PER_RUN,
    performance:Number(item?.durationMs||0)>0&&Number(item?.durationMs||0)<=MAX_DURATION_MS,
    productionSource:String(item?.source||'')===PRODUCTION_SOURCE,
    timestamp:Number(item?.lastAt||0)>0
  });
}

function rowPass(check){
  return Object.values(check).every(Boolean);
}

export function evaluateRecipesProductsMigrationGate({dependencyReadiness,observations}={}){
  const dependencyPass=dependencyReadiness?.pass===true&&dependencyReadiness?.unlockDependents===true;
  const list=(Array.isArray(observations)?observations:[])
    .filter(Boolean)
    .sort((a,b)=>Number(a.lastAt||0)-Number(b.lastAt||0));
  const recent=list.slice(-REQUIRED_CONSECUTIVE_PASSES);
  const checks=recent.map(healthy);
  const intervals=recent.slice(1).map((item,index)=>Number(item.lastAt||0)-Number(recent[index]?.lastAt||0));
  const temporalIntegrity=intervals.every(interval=>Number.isFinite(interval)&&interval>=MIN_OBSERVATION_INTERVAL_MS);

  let creditedPasses=0;
  for(let index=recent.length-1;index>=0;index--){
    if(!rowPass(checks[index]))break;
    if(index<recent.length-1){
      const interval=Number(recent[index+1]?.lastAt||0)-Number(recent[index]?.lastAt||0);
      if(!Number.isFinite(interval)||interval<MIN_OBSERVATION_INTERVAL_MS)break;
    }
    creditedPasses++;
  }

  const ownGatePass=recent.length===REQUIRED_CONSECUTIVE_PASSES&&creditedPasses===REQUIRED_CONSECUTIVE_PASSES&&temporalIntegrity;
  const pass=dependencyPass&&ownGatePass;

  return Object.freeze({
    pass,
    dependencyPass,
    dependencySource:'v3-2-consolidated-readiness',
    ownGatePass,
    authoritative:false,
    activationAllowed:false,
    requiredConsecutivePasses:REQUIRED_CONSECUTIVE_PASSES,
    observedPasses:creditedPasses,
    readsPerRun:REQUIRED_READS_PER_RUN,
    maxDurationMs:MAX_DURATION_MS,
    minObservationIntervalMs:MIN_OBSERVATION_INTERVAL_MS,
    temporalIntegrity,
    intervalsMs:Object.freeze([...intervals]),
    checks:Object.freeze(checks),
    recommendation:pass?'eligible-for-controlled-shadow-review':dependencyPass?'continue-v3-3-observation':'blocked-by-v3-2-readiness'
  });
}

export const RECIPES_PRODUCTS_MIGRATION_GATE=Object.freeze({
  dependency:'V3-2',
  dependencyContract:'consolidated-readiness',
  requireDependencyUnlock:true,
  requiredConsecutivePasses:REQUIRED_CONSECUTIVE_PASSES,
  readsPerRun:REQUIRED_READS_PER_RUN,
  maxDurationMs:MAX_DURATION_MS,
  minObservationIntervalMs:MIN_OBSERVATION_INTERVAL_MS,
  productionSource:PRODUCTION_SOURCE,
  rollbackTarget:'v2',
  dualWrite:false,
  autoPromotion:false,
  productionActivation:false
});
