import {evaluateIngredientsInventoryMigrationGate} from './migration-gate.js';
import {evaluateAcceleratedIngredientsInventoryValidation} from './accelerated-validation.js';

export function evaluateIngredientsInventoryReadiness({productionObservations,technicalObservations}={}){
  const productionGate=evaluateIngredientsInventoryMigrationGate(productionObservations);
  const technicalValidation=evaluateAcceleratedIngredientsInventoryValidation(technicalObservations);
  const pass=productionGate.pass===true&&technicalValidation.pass===true;

  return Object.freeze({
    pass,
    productionReady:productionGate.pass===true,
    technicalReady:technicalValidation.pass===true,
    productionGate,
    technicalValidation,
    authoritative:false,
    activationAllowed:false,
    unlockDependents:pass,
    autoPromotion:false,
    recommendation:pass?'candidate-for-read-authority-review':productionGate.pass?'run-or-pass-technical-validation':'continue-production-soak'
  });
}

export const INGREDIENTS_INVENTORY_READINESS_POLICY=Object.freeze({
  productionPassesRequired:3,
  technicalRoundsRequired:3,
  technicalProductionObservationCredit:0,
  requireBoth:true,
  unlockDependentsOnlyWhenReady:true,
  activationAllowed:false,
  autoPromotion:false,
  defaultAuthority:'v2'
});
