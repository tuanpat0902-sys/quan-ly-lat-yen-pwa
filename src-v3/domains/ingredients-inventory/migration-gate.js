const MAX_DURATION_MS=5000;
const REQUIRED_CONSECUTIVE_PASSES=3;

export function evaluateIngredientsInventoryMigrationGate(observations=[]){
  const list=(Array.isArray(observations)?observations:[]).filter(Boolean).sort((a,b)=>Number(a.lastAt||0)-Number(b.lastAt||0));
  const recent=list.slice(-REQUIRED_CONSECUTIVE_PASSES);
  const checks=recent.map(item=>Object.freeze({
    parity:item.parityReady===true,
    complete:item.complete===true,
    zeroWrites:Number(item.writes||0)===0,
    boundedReads:Number(item.reads||0)===2,
    performance:Number(item.durationMs||0)>0&&Number(item.durationMs||0)<=MAX_DURATION_MS
  }));
  const pass=recent.length===REQUIRED_CONSECUTIVE_PASSES&&checks.every(row=>Object.values(row).every(Boolean));
  return Object.freeze({
    pass,
    authoritative:false,
    requiredConsecutivePasses:REQUIRED_CONSECUTIVE_PASSES,
    observedPasses:checks.filter(row=>Object.values(row).every(Boolean)).length,
    maxDurationMs:MAX_DURATION_MS,
    checks:Object.freeze(checks),
    recommendation:pass?'candidate-for-read-authority-review':'keep-v2-authoritative'
  });
}

export const INGREDIENTS_INVENTORY_MIGRATION_GATE=Object.freeze({
  requiredConsecutivePasses:REQUIRED_CONSECUTIVE_PASSES,
  maxDurationMs:MAX_DURATION_MS,
  rollbackTarget:'v2',
  dualWrite:false,
  autoPromotion:false
});
