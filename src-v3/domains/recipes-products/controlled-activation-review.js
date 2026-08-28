export const RECIPES_PRODUCTS_CONTROLLED_ACTIVATION_REVIEW=Object.freeze({
  dependency:'V3-2',
  reviewOnly:true,
  activationAllowed:false,
  autoActivation:false,
  autoPromotion:false,
  cloudWrites:0,
  dualWrite:false,
  protectRecipeItems:true,
  inventoryDeductionChanges:false,
  rollbackTarget:'v2'
});

export function evaluateRecipesProductsControlledActivationReview({dependencyReadiness,migrationGate,safety}={}){
  const dependencyReady=dependencyReadiness?.pass===true&&dependencyReadiness?.unlockDependents===true;
  const migrationReady=migrationGate?.pass===true&&migrationGate?.dependencyPass===true&&migrationGate?.ownGatePass===true;
  const safetyReady=
    safety?.cloudWrites===0&&
    safety?.dualWrite===false&&
    safety?.recipeItemsProtected===true&&
    safety?.inventoryDeductionUnchanged===true;
  const reviewEligible=dependencyReady&&migrationReady&&safetyReady;

  return Object.freeze({
    reviewEligible,
    dependencyReady,
    migrationReady,
    safetyReady,
    reviewOnly:true,
    activationAllowed:false,
    authoritative:false,
    cloudWrites:0,
    dualWrite:false,
    recipeItemsProtected:true,
    inventoryDeductionUnchanged:true,
    autoActivation:false,
    autoPromotion:false,
    recommendation:reviewEligible?'manual-controlled-shadow-activation-review':'keep-v3-3-locked'
  });
}
