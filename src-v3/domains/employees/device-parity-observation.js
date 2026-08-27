import {evaluateEmployeesDirectoryParityGate} from './parity-gate.js';

export const EMPLOYEES_DEVICE_PARITY_STORAGE_KEY='lat_yen_v3_employees_directory_parity_v1';

function text(value){return String(value??'').trim();}
function count(value){const n=Number(value);return Number.isFinite(n)&&n>=0?Math.trunc(n):0;}
function duration(value){const n=Number(value);return Number.isFinite(n)&&n>0?Math.round(n):0;}
function resolveNow(value){const raw=typeof value==='function'?value():value;const n=Number(raw);return Number.isFinite(n)&&n>0?n:Date.now();}

export function createEmployeesDeviceParityObservation({source,complete,parityReady,reads,writes,durationMs,legacyCount,cloudCount}={}){
  return Object.freeze({
    source:text(source),
    complete:complete===true,
    parityReady:parityReady===true,
    reads:count(reads),
    writes:count(writes),
    durationMs:duration(durationMs),
    legacyCount:count(legacyCount),
    cloudCount:count(cloudCount)
  });
}

export function evaluateEmployeesDeviceParityObservation(input){
  const observation=createEmployeesDeviceParityObservation(input);
  return evaluateEmployeesDirectoryParityGate(observation);
}

export function persistEmployeesDeviceParityObservation({storage,orgId,warehouseId,observation,now=Date.now}={}){
  if(!storage?.getItem||!storage?.setItem)throw new Error('storage is required');
  const oid=text(orgId),wid=text(warehouseId);
  if(!oid)throw new Error('orgId is required');
  if(!wid)throw new Error('warehouseId is required');
  const normalized=createEmployeesDeviceParityObservation(observation);
  if(normalized.source!=='device-local'){
    return Object.freeze({persisted:false,reason:'device-local-source-required',gate:evaluateEmployeesDirectoryParityGate(normalized)});
  }
  const gate=evaluateEmployeesDirectoryParityGate(normalized);
  let saved={};
  try{saved=JSON.parse(storage.getItem(EMPLOYEES_DEVICE_PARITY_STORAGE_KEY)||'{}')||{};}catch(_){saved={};}
  const orgs=saved.orgs&&typeof saved.orgs==='object'?saved.orgs:{};
  const warehouses=orgs[oid]?.warehouses&&typeof orgs[oid].warehouses==='object'?orgs[oid].warehouses:{};
  warehouses[wid]={
    lastAt:resolveNow(now),
    observation:normalized,
    gate:{
      pass:gate.pass===true,
      realDevice:gate.realDevice===true,
      countsMatch:gate.countsMatch===true,
      cloudSeedRequired:gate.cloudSeedRequired===true,
      unlockControlledShadowReview:gate.unlockControlledShadowReview===true,
      recommendation:String(gate.recommendation||'')
    },
    authoritative:false,
    activationAllowed:false,
    autoPromotion:false,
    productionObservationCredit:gate.pass===true?1:0,
    containsEmployeeRows:false,
    cloudWrites:0
  };
  orgs[oid]={warehouses};
  storage.setItem(EMPLOYEES_DEVICE_PARITY_STORAGE_KEY,JSON.stringify({version:1,orgs}));
  return Object.freeze({persisted:true,gate,entry:warehouses[wid]});
}

export function readEmployeesDeviceParityObservation({storage,orgId,warehouseId}={}){
  if(!storage?.getItem)return null;
  const oid=text(orgId),wid=text(warehouseId);
  if(!oid||!wid)return null;
  try{
    const saved=JSON.parse(storage.getItem(EMPLOYEES_DEVICE_PARITY_STORAGE_KEY)||'{}')||{};
    const entry=saved?.orgs?.[oid]?.warehouses?.[wid];
    return entry&&typeof entry==='object'?Object.freeze({...entry}):null;
  }catch(_){return null;}
}

export const EMPLOYEES_DEVICE_PARITY_OBSERVATION_POLICY=Object.freeze({
  storage:'localStorage-only',
  source:'device-local',
  containsEmployeeRows:false,
  cloudReadsAdded:0,
  cloudWrites:0,
  syntheticCredit:0,
  authoritative:false,
  activationAllowed:false,
  autoPromotion:false
});
