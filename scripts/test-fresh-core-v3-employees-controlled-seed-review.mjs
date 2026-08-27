import assert from 'node:assert/strict';
import {evaluateEmployeesControlledSeedReview,EMPLOYEES_CONTROLLED_SEED_REVIEW_POLICY as POLICY} from '../src-v3/domains/employees/controlled-seed-review.js';

const missingCloud=evaluateEmployeesControlledSeedReview({
  source:'device-local',complete:true,parityReady:false,reads:1,writes:0,durationMs:120,legacyCount:3,cloudCount:0
});
assert.equal(missingCloud.eligible,true);
assert.equal(missingCloud.realDevice,true);
assert.equal(missingCloud.cloudSeedRequired,true);
assert.equal(missingCloud.parityPass,false);
assert.equal(missingCloud.recommendation,'eligible-for-controlled-cloud-directory-seed-review');
assert.equal(missingCloud.seedAllowed,false);
assert.equal(missingCloud.seedExecuted,false);
assert.equal(missingCloud.writesAllowed,false);
assert.equal(missingCloud.cloudWrites,0);
assert.equal(missingCloud.authoritative,false);
assert.equal(missingCloud.activationAllowed,false);
assert.equal(missingCloud.autoSeed,false);
assert.equal(missingCloud.autoPromotion,false);

const synthetic=evaluateEmployeesControlledSeedReview({
  source:'synthetic',complete:true,parityReady:false,reads:1,writes:0,durationMs:120,legacyCount:3,cloudCount:0
});
assert.equal(synthetic.eligible,false,'synthetic evidence must never unlock seed review');
assert.equal(synthetic.realDevice,false);

const parityPass=evaluateEmployeesControlledSeedReview({
  source:'device-local',complete:true,parityReady:true,reads:1,writes:0,durationMs:120,legacyCount:3,cloudCount:3
});
assert.equal(parityPass.eligible,false,'passing parity must not request a seed review');
assert.equal(parityPass.parityPass,true);
assert.equal(parityPass.recommendation,'parity-already-passes-no-seed-review-needed');

for(const invalid of [
  {source:'device-local',complete:false,parityReady:false,reads:1,writes:0,durationMs:120,legacyCount:3,cloudCount:0},
  {source:'device-local',complete:true,parityReady:false,reads:2,writes:0,durationMs:120,legacyCount:3,cloudCount:0},
  {source:'device-local',complete:true,parityReady:false,reads:1,writes:1,durationMs:120,legacyCount:3,cloudCount:0},
  {source:'device-local',complete:true,parityReady:false,reads:1,writes:0,durationMs:6000,legacyCount:3,cloudCount:0},
  {source:'device-local',complete:true,parityReady:false,reads:1,writes:0,durationMs:120,legacyCount:0,cloudCount:0}
])assert.equal(evaluateEmployeesControlledSeedReview(invalid).eligible,false);

assert.deepEqual(POLICY,{
  requiresRealDeviceObservation:true,
  requiresCompleteObservation:true,
  readsPerObservation:1,
  writesPerObservation:0,
  maxDurationMs:5000,
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

console.log('Fresh Core V3-6 controlled seed review evaluator: PASS');
