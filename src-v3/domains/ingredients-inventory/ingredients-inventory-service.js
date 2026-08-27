import {INGREDIENTS_INVENTORY_CONTRACT as C} from './ingredients-inventory-contract.js';
import {compareIngredientsInventory} from './parity.js';

export function createIngredientsInventoryService({repository,cache,events,v2Adapter}){
  if(!repository||!cache||!events)throw new Error('repository, cache and events are required');
  async function refreshShadow(){
    const [ingredients,inventory]=await Promise.all([repository.listIngredients(),repository.listInventory()]);
    cache.set(C.cache.ingredients,ingredients,{ttlMs:60000,meta:{domain:C.domain}});
    cache.set(C.cache.inventory,inventory,{ttlMs:60000,meta:{domain:C.domain}});
    const v2=v2Adapter?.getState?.()||{};
    const parity=Object.freeze({
      ingredients:compareIngredientsInventory('ingredients',v2.ingredients,ingredients),
      inventory:compareIngredientsInventory('inventory',v2.inventoryData?.balances,inventory)
    });
    const parityReady=parity.ingredients.equal&&parity.inventory.equal;
    const snapshot=Object.freeze({ingredients,inventory,parity,parityReady,authoritative:false,mode:'shadow'});
    events.emit('ingredients-inventory:shadow-refreshed',snapshot);
    if(!parityReady)events.emit('ingredients-inventory:parity-mismatch',parity);
    return snapshot;
  }
  async function refreshControlledShadow(){
    const result=await repository.readControlledShadow();
    const completeIngredients=result.ingredients.rows.length>=result.ingredients.count;
    const completeInventory=result.inventory.rows.length>=result.inventory.count;
    const complete=completeIngredients&&completeInventory;
    const v2=v2Adapter?.getState?.()||{};
    const parity=Object.freeze({
      ingredients:compareIngredientsInventory('ingredients',v2.ingredients,result.ingredients.rows),
      inventory:compareIngredientsInventory('inventory',v2.inventoryData?.balances,result.inventory.rows)
    });
    const parityReady=complete&&parity.ingredients.equal&&parity.inventory.equal;
    const snapshot=Object.freeze({
      ingredients:result.ingredients.rows,
      inventory:result.inventory.rows,
      counts:Object.freeze({ingredients:result.ingredients.count,inventory:result.inventory.count}),
      complete,
      parity,
      parityReady,
      authoritative:false,
      mode:'controlled-shadow'
    });
    events.emit('ingredients-inventory:controlled-shadow-refreshed',snapshot);
    if(!parityReady)events.emit('ingredients-inventory:parity-mismatch',snapshot);
    return snapshot;
  }
  const readOnly=()=>{throw new Error('Fresh Core V3 Ingredients + Inventory is shadow read-only');};
  return Object.freeze({mode:'shadow',authoritative:false,refreshShadow,refreshControlledShadow,saveIngredient:readOnly,saveInventory:readOnly});
}
