export const EMPLOYEES_EMPTY_DOMAIN_HOLD=Object.freeze({
  status:'empty-production-domain-hold',
  currentAuthority:'legacy-local',
  productionActivation:false,
  repositoryRuntimeActivated:false,
  cloudWrites:0,
  seedAllowed:false,
  autoSeed:false,
  autoPromotion:false,
  emptyDatasetCredit:0,
  resumeWhen:'legacy-employee-count-positive',
  nextGate:'rerun-real-device-parity-after-first-legacy-employee'
});

export function evaluateEmployeesEmptyDomainHold({legacyCount,cloudCount}={}){
  const legacy=Math.max(0,Math.trunc(Number(legacyCount)||0));
  const cloud=Math.max(0,Math.trunc(Number(cloudCount)||0));
  const empty=legacy===0&&cloud===0;
  return Object.freeze({
    hold:empty,
    legacyCount:legacy,
    cloudCount:cloud,
    productionObservationCredit:0,
    seedAllowed:false,
    writesAllowed:false,
    cloudWrites:0,
    productionActivation:false,
    authoritative:false,
    currentAuthority:'legacy-local',
    recommendation:empty
      ?'hold-until-first-legacy-employee-then-rerun-device-parity'
      :'leave-empty-domain-hold-and-rerun-device-parity'
  });
}
