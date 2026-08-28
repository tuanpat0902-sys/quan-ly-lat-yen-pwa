const MAX_DURATION_MS=5000;
const REQUIRED_CONSECUTIVE_PASSES=3;
const MIN_OBSERVATION_INTERVAL_MS=24*60*60*1000;
const PRODUCTION_SOURCE='device-local-production-soak';

function validSource(item){
  const source=String(item?.source||'');
  return !source||source===PRODUCTION_SOURCE;
}

function healthy(item){
  return Object.freeze({
    parity:item?.parityReady===true,
    complete:item?.complete===true,
    zeroWrites:Number(item?.writes||0)===0,
    boundedReads:Number(item?.reads||0)===2,
    performance:Number(item?.durationMs||0)>0&&Number(item?.durationMs||0)<=MAX_DURATION_MS,
    productionSource:validSource(item),
    timestamp:Number(item?.lastAt||0)>0
  });
}

function rowPass(check){
  return Object.values(check).every(Boolean);
}

export function evaluateIngredientsInventoryMigrationGate(observations=[]){
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

  const pass=recent.length===REQUIRED_CONSECUTIVE_PASSES&&creditedPasses===REQUIRED_CONSECUTIVE_PASSES&&temporalIntegrity;
  return Object.freeze({
    pass,
    authoritative:false,
    requiredConsecutivePasses:REQUIRED_CONSECUTIVE_PASSES,
    observedPasses:creditedPasses,
    maxDurationMs:MAX_DURATION_MS,
    minObservationIntervalMs:MIN_OBSERVATION_INTERVAL_MS,
    temporalIntegrity,
    intervalsMs:Object.freeze([...intervals]),
    checks:Object.freeze(checks),
    recommendation:pass?'candidate-for-read-authority-review':'keep-v2-authoritative'
  });
}

export const INGREDIENTS_INVENTORY_MIGRATION_GATE=Object.freeze({
  requiredConsecutivePasses:REQUIRED_CONSECUTIVE_PASSES,
  maxDurationMs:MAX_DURATION_MS,
  minObservationIntervalMs:MIN_OBSERVATION_INTERVAL_MS,
  productionSource:PRODUCTION_SOURCE,
  rollbackTarget:'v2',
  dualWrite:false,
  autoPromotion:false
});
