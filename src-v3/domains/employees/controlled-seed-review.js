import {evaluateEmployeesDirectoryParityGate} from './parity-gate.js';

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

export function evaluateEmployeesControlledSeedReview(observation){
  const normalized=normalizeObservation(observation);
  const gate=evaluateEmployeesDirectoryParityGate(normalized);
  const realDevice=normalized.source==='device-local';
  const eligible=realDevice&&gate.cloudSeedRequired===true&&gate.pass===false&&normalized.writes===0;
  return Object.freeze({
    eligible,
    realDevice,
    cloudSeedRequired:gate.cloudSeedRequired===true,
    parityPass:gate.pass===true,
    observation:normalized,
    gate,
    reviewOnly:true,
    seedAllowed:false,
    seedExecuted:false,
    writesAllowed:false,
    cloudWrites:0,
    authoritative:false,
    activationAllowed:false,
    autoSeed:false,
    autoPromotion:false,
    recommendation:eligible
      ?'eligible-for-controlled-cloud-directory-seed-review'
      :gate.pass
        ?'parity-already-passes-no-seed-review-needed'
        :'obtain-real-device-cloud-seed-required-observation'
  });
}

export const EMPLOYEES_CONTROLLED_SEED_REVIEW_POLICY=Object.freeze({
  requiresRealDeviceObservation:true,
  requiresCloudSeedRequired:true,
  reviewOnly:true,
  seedAllowed:false,
  seedExecuted:false,
  writesAllowed:false,
  cloudWrites:0,
  authoritative:false,
  activationAllowed:false,
  autoSeed:false,
  autoPromotion:false
});
