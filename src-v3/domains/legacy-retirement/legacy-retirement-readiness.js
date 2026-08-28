const REQUIRED_WAVES=Object.freeze(['V3-1','V3-2','V3-3','V3-4','V3-5','V3-6','V3-7','V3-8']);

function waveReady(wave){
  if(!wave||typeof wave!=='object')return false;
  if(wave.authoritative!=='v3')return false;
  if(wave.evidence?.productionActivation!==true)return false;
  if(wave.evidence?.dualWrite===true)return false;
  return true;
}

export function evaluateLegacyRetirementReadiness(plan){
  if(!plan||typeof plan!=='object'){
    return Object.freeze({ready:false,reason:'invalid-plan',blockedWaves:[...REQUIRED_WAVES],retirementAllowed:false,legacyRemovalAllowed:false,loaderRemovalAllowed:false,fallbackRemovalAllowed:false});
  }

  const waves=Array.isArray(plan.waves)?plan.waves:[];
  const byId=new Map(waves.map(wave=>[wave?.id,wave]));
  const blockedWaves=REQUIRED_WAVES.filter(id=>!waveReady(byId.get(id)));
  const globalSafety=plan.dualWrite===false&&plan.rollback?.required===true&&plan.rollback?.scope==='per-domain';
  const ready=globalSafety&&blockedWaves.length===0;

  return Object.freeze({
    ready,
    reason:ready?'all-upstream-waves-v3-authoritative':'upstream-gates-open',
    blockedWaves:Object.freeze([...blockedWaves]),
    globalSafety,
    retirementAllowed:ready,
    legacyRemovalAllowed:ready,
    loaderRemovalAllowed:ready,
    fallbackRemovalAllowed:ready,
    autoRetirement:false
  });
}

export const LEGACY_RETIREMENT_POLICY=Object.freeze({
  wave:'V3-9',
  requiredWaves:REQUIRED_WAVES,
  requiredAuthority:'v3',
  requireProductionActivation:true,
  requireGlobalDualWriteDisabled:true,
  requirePerDomainRollback:true,
  autoRetirement:false,
  productionWrites:0
});
