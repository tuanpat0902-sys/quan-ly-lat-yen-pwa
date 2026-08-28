const MAX_DURATION_MS=5000;
const REQUIRED_ROUNDS=3;

export const INGREDIENTS_INVENTORY_ACCELERATED_POLICY=Object.freeze({
  rounds:REQUIRED_ROUNDS,
  queriesPerRound:2,
  totalQueries:6,
  cloudWrites:0,
  cooldownMs:24*60*60*1000,
  interRoundDelayMs:750,
  maxDurationMs:MAX_DURATION_MS,
  autoPromotion:false,
  productionObservationCredit:0,
  advisoryOnly:true
});

export function evaluateAcceleratedIngredientsInventoryValidation(observations=[]){
  const recent=(Array.isArray(observations)?observations:[]).filter(Boolean).slice(-REQUIRED_ROUNDS);
  const checks=recent.map(item=>Object.freeze({
    parity:item?.parityReady===true,
    complete:item?.complete===true,
    zeroWrites:Number(item?.writes||0)===0,
    boundedReads:Number(item?.reads||0)===2,
    performance:Number(item?.durationMs||0)>0&&Number(item?.durationMs||0)<=MAX_DURATION_MS
  }));
  const pass=recent.length===REQUIRED_ROUNDS&&checks.every(check=>Object.values(check).every(Boolean));
  return Object.freeze({
    pass,
    authoritative:false,
    accelerated:true,
    advisoryOnly:true,
    productionObservationCredit:0,
    requiredRounds:REQUIRED_ROUNDS,
    checks:Object.freeze(checks),
    recommendation:pass?'technical-validation-pass':'keep-v2-authoritative'
  });
}
