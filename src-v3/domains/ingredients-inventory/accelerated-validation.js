import {evaluateIngredientsInventoryMigrationGate} from './migration-gate.js';

export const INGREDIENTS_INVENTORY_ACCELERATED_POLICY=Object.freeze({
  rounds:3,
  queriesPerRound:2,
  totalQueries:6,
  cloudWrites:0,
  cooldownMs:24*60*60*1000,
  interRoundDelayMs:750,
  autoPromotion:false,
  productionObservationCredit:0,
  advisoryOnly:true
});

export function evaluateAcceleratedIngredientsInventoryValidation(observations=[]){
  const gate=evaluateIngredientsInventoryMigrationGate(observations);
  return Object.freeze({
    ...gate,
    accelerated:true,
    advisoryOnly:true,
    productionObservationCredit:0,
    recommendation:gate.pass?'technical-validation-pass':'keep-v2-authoritative'
  });
}
