import {evaluateIngredientsInventoryReadiness} from './readiness.js';

function asObject(value){
  return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
}

function historyOf(entry,key){
  const list=asObject(entry)[key];
  return Array.isArray(list)?list.filter(Boolean):[];
}

export function createIngredientsInventoryLocalReadinessSnapshot({orgId,soakStored,validationStored}={}){
  const id=String(orgId||'');
  const soakRoot=asObject(soakStored);
  const validationRoot=asObject(validationStored);
  const soakEntry=id?asObject(asObject(soakRoot.orgs)[id]):{};
  const validationEntry=id?asObject(asObject(validationRoot.orgs)[id]):{};
  const productionObservations=historyOf(soakEntry,'history');
  const technicalObservations=historyOf(validationEntry,'observations');
  const readiness=evaluateIngredientsInventoryReadiness({productionObservations,technicalObservations});

  return Object.freeze({
    orgId:id,
    hasOrg:!!id,
    productionObservationCount:productionObservations.length,
    technicalObservationCount:technicalObservations.length,
    productionLastAt:Number(soakEntry.lastAt||0),
    technicalLastAt:Number(validationEntry.lastAt||0),
    productionPersistedGate:soakEntry.gate||null,
    technicalPersistedResult:validationEntry.result||null,
    readiness,
    unlockDependents:readiness.unlockDependents===true,
    activationAllowed:false,
    authoritative:false,
    source:'localStorage-only'
  });
}

export const INGREDIENTS_INVENTORY_LOCAL_READINESS_POLICY=Object.freeze({
  source:'localStorage-only',
  cloudReads:0,
  cloudWrites:0,
  syntheticObservations:false,
  activationAllowed:false,
  authoritative:false
});
