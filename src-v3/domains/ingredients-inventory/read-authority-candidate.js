import {resolveIngredientsInventoryReadMode} from './rollback-contract.js';

export const INGREDIENTS_INVENTORY_READ_CANDIDATE=Object.freeze({
  domain:'ingredients-inventory',
  defaultAuthority:'v2',
  candidateAuthority:'v3',
  autoPromotion:false,
  dualWrite:false,
  cloudMutation:false,
  requireProductionGate:true,
  requireTechnicalPass:true
});

export function resolveIngredientsInventoryCandidate({storage,productionGate,technicalValidation}={}){
  const requested=resolveIngredientsInventoryReadMode(storage);
  const productionReady=productionGate?.pass===true;
  const technicalReady=technicalValidation?.pass===true;
  const enabled=requested==='v3-candidate'&&productionReady&&technicalReady;

  return Object.freeze({
    mode:enabled?'v3-candidate':'v2',
    enabled,
    productionReady,
    technicalReady,
    requested,
    fallback:'v2',
    authoritative:false,
    autoPromotion:false
  });
}
