import {RECIPES_PRODUCTS_CONTRACT as C} from './recipes-products-contract.js';
import {compareRecipesProducts} from './parity.js';

export function createRecipesProductsService({repository,cache,events,v2Adapter}){
  if(!repository||!cache||!events)throw new Error('repository, cache and events are required');

  async function refreshShadow(){
    const [products,recipeItems]=await Promise.all([repository.listProducts(),repository.listRecipeItems()]);
    cache.set(C.cache.products,products,{ttlMs:60000,meta:{domain:C.domain}});
    cache.set(C.cache.recipeItems,recipeItems,{ttlMs:60000,meta:{domain:C.domain}});
    const v2=v2Adapter?.getState?.()||{};
    const parity=Object.freeze({
      products:compareRecipesProducts('products',v2.products,products),
      recipeItems:compareRecipesProducts('recipeItems',v2.recipeItems,recipeItems)
    });
    const parityReady=parity.products.equal&&parity.recipeItems.equal;
    const snapshot=Object.freeze({products,recipeItems,parity,parityReady,authoritative:false,mode:'shadow'});
    events.emit('recipes-products:shadow-refreshed',snapshot);
    if(!parityReady)events.emit('recipes-products:parity-mismatch',parity);
    return snapshot;
  }

  async function refreshControlledShadow(){
    const result=await repository.readControlledShadow();
    const completeProducts=result.products.rows.length>=result.products.count;
    const completeRecipeItems=result.recipeItems.rows.length>=result.recipeItems.count;
    const complete=completeProducts&&completeRecipeItems;
    const v2=v2Adapter?.getState?.()||{};
    const parity=Object.freeze({
      products:compareRecipesProducts('products',v2.products,result.products.rows),
      recipeItems:compareRecipesProducts('recipeItems',v2.recipeItems,result.recipeItems.rows)
    });
    const parityReady=complete&&parity.products.equal&&parity.recipeItems.equal;
    const snapshot=Object.freeze({
      products:result.products.rows,
      recipeItems:result.recipeItems.rows,
      counts:Object.freeze({products:result.products.count,recipeItems:result.recipeItems.count}),
      complete,
      parity,
      parityReady,
      authoritative:false,
      mode:'controlled-shadow'
    });
    events.emit('recipes-products:controlled-shadow-refreshed',snapshot);
    if(!parityReady)events.emit('recipes-products:parity-mismatch',snapshot);
    return snapshot;
  }

  const readOnly=()=>{throw new Error('Fresh Core V3 Recipes / Products is shadow read-only');};
  return Object.freeze({
    mode:'shadow',authoritative:false,refreshShadow,refreshControlledShadow,
    saveProduct:readOnly,saveRecipeItem:readOnly,removeProduct:readOnly,removeRecipeItem:readOnly
  });
}
