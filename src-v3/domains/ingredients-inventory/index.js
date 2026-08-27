import {createIngredientsInventoryRepository} from './ingredients-inventory-repository.js';
import {createIngredientsInventoryService} from './ingredients-inventory-service.js';
import {INGREDIENTS_INVENTORY_CONTRACT} from './ingredients-inventory-contract.js';

export function createIngredientsInventoryDomain({gateway,cache,events,v2Adapter}){
  const repository=createIngredientsInventoryRepository({gateway});
  const service=createIngredientsInventoryService({repository,cache,events,v2Adapter});
  return Object.freeze({id:INGREDIENTS_INVENTORY_CONTRACT.domain,contract:INGREDIENTS_INVENTORY_CONTRACT,repository,service});
}

export async function activate(context){
  const domain=createIngredientsInventoryDomain(context);
  return Object.freeze({
    domain,
    refreshShadow:()=>domain.service.refreshShadow(),
    refreshControlledShadow:()=>domain.service.refreshControlledShadow(),
    deactivate:async()=>{}
  });
}

export {INGREDIENTS_INVENTORY_CONTRACT} from './ingredients-inventory-contract.js';
export {createIngredientsInventoryRepository} from './ingredients-inventory-repository.js';
export {createIngredientsInventoryService} from './ingredients-inventory-service.js';
export {compareIngredientsInventory} from './parity.js';
export {INGREDIENTS_INVENTORY_SCHEMA,normalizeIngredientsInventoryRow,normalizeIngredientsInventoryRows} from './schema-contract.js';
export {INGREDIENTS_INVENTORY_READ_CANDIDATE,resolveIngredientsInventoryCandidate} from './read-authority-candidate.js';
export {INGREDIENTS_INVENTORY_READINESS_POLICY,evaluateIngredientsInventoryReadiness} from './readiness.js';
