export const INGREDIENTS_INVENTORY_ROLLBACK=Object.freeze({
  domain:'ingredients-inventory',
  currentAuthority:'v2',
  fallbackAuthority:'v2',
  switchType:'local-runtime-flag',
  defaultMode:'v2',
  dualWrite:false,
  cloudMutation:false,
  autoRollbackAllowed:true
});

export function resolveIngredientsInventoryReadMode(storage){
  try{
    const raw=storage?.getItem?.('lat_yen_v3_ingredients_inventory_read_mode');
    return raw==='v3-candidate'?'v3-candidate':'v2';
  }catch(_){return 'v2';}
}
