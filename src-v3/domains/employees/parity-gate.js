const MAX_DURATION_MS=5000;

function normalizeObservation(value){
  const o=value&&typeof value==='object'?value:{};
  return Object.freeze({
    source:String(o.source||''),
    complete:o.complete===true,
    parityReady:o.parityReady===true,
    reads:Number(o.reads||0),
    writes:Number(o.writes||0),
    durationMs:Number(o.durationMs||0),
    legacyCount:Number(o.legacyCount||0),
    cloudCount:Number(o.cloudCount||0)
  });
}

export function evaluateEmployeesDirectoryParityGate(observation){
  const o=normalizeObservation(observation);
  const realDevice=o.source==='device-local';
  const bounded=o.durationMs>0&&o.durationMs<=MAX_DURATION_MS;
  const countsMatch=o.legacyCount===o.cloudCount;
  const pass=realDevice&&o.complete&&o.parityReady&&countsMatch&&o.reads===1&&o.writes===0&&bounded;
  const cloudSeedRequired=o.legacyCount>0&&o.cloudCount===0;
  return Object.freeze({
    pass,
    realDevice,
    bounded,
    countsMatch,
    cloudSeedRequired,
    observation:o,
    authoritative:false,
    activationAllowed:false,
    unlockControlledShadowReview:pass,
    autoPromotion:false,
    recommendation:pass
      ?'eligible-for-controlled-shadow-review'
      :cloudSeedRequired
        ?'cloud-directory-seed-required-before-parity'
        :'obtain-real-device-directory-parity-observation'
  });
}

export const EMPLOYEES_DIRECTORY_PARITY_GATE_POLICY=Object.freeze({
  source:'device-local',
  observationsRequired:1,
  readsPerObservation:1,
  writesPerObservation:0,
  maxDurationMs:MAX_DURATION_MS,
  syntheticCredit:0,
  activationAllowed:false,
  authoritative:false,
  autoPromotion:false
});
