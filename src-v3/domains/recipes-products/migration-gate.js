const MAX_DURATION_MS=5000;
const REQUIRED_CONSECUTIVE_PASSES=3;
const REQUIRED_READS_PER_RUN=2;

export function evaluateRecipesProductsMigrationGate({dependencyGate,observations}={}){
  const dependencyPass=dependencyGate?.pass===true;
  const list=(Array.isArray(observations)?observations:[]).filter(Boolean).sort((a,b)=>Number(a.lastAt||0)-Number(b.lastAt||0));
  const recent=list.slice(-REQUIRED_CONSECUTIVE_PASSES);
  const checks=recent.map(item=>Object.freeze({
    parity:item.parityReady===true,
    complete:item.complete===true,
    zeroWrites:Number(item.writes||0)===0,
    boundedReads:Number(item.reads||0)===REQUIRED_READS_PER_RUN,
    performance:Number(item.durationMs||0)>0&&Number(item.durationMs||0)<=MAX_DURATION_MS
  }));
  const ownGatePass=recent.length===REQUIRED_CONSECUTIVE_PASSES&&checks.every(row=>Object.values(row).every(Boolean));
  const pass=dependencyPass&&ownGatePass;

  return Object.freeze({
    pass,
    dependencyPass,
    ownGatePass,
    authoritative:false,
    activationAllowed:false,
    requiredConsecutivePasses:REQUIRED_CONSECUTIVE_PASSES,
    observedPasses:checks.filter(row=>Object.values(row).every(Boolean)).length,
    readsPerRun:REQUIRED_READS_PER_RUN,
    maxDurationMs:MAX_DURATION_MS,
    checks:Object.freeze(checks),
    recommendation:pass?'eligible-for-controlled-shadow-review':dependencyPass?'continue-v3-3-observation':'blocked-by-v3-2'
  });
}

export const RECIPES_PRODUCTS_MIGRATION_GATE=Object.freeze({
  dependency:'V3-2',
  requiredConsecutivePasses:REQUIRED_CONSECUTIVE_PASSES,
  readsPerRun:REQUIRED_READS_PER_RUN,
  maxDurationMs:MAX_DURATION_MS,
  rollbackTarget:'v2',
  dualWrite:false,
  autoPromotion:false,
  productionActivation:false
});
