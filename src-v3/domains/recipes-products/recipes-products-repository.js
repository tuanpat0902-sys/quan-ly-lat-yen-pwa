import {RECIPES_PRODUCTS_CONTRACT as C} from './recipes-products-contract.js';
import {RECIPES_PRODUCTS_SCHEMA as S} from './schema-contract.js';

export function createRecipesProductsRepository({gateway}){
  if(!gateway)throw new Error('gateway is required');

  async function collectAll(table,configure){
    const rows=[];
    for(let page=1;page<=100;page++){
      const result=await gateway.selectPage(table,{page,pageSize:C.pageSize,configure});
      rows.push(...result.rows);
      if(result.rows.length<C.pageSize||rows.length>=result.count)break;
    }
    return rows;
  }

  const listProducts=()=>collectAll(C.tables.products,q=>q.order?.('created_at',{ascending:true})?.order?.('id',{ascending:true})??q);
  const listRecipeItems=()=>collectAll(C.tables.recipeItems,q=>q.order?.('product_id',{ascending:true})?.order?.('ingredient_id',{ascending:true})?.order?.('id',{ascending:true})??q);

  async function readControlledShadow(){
    const [products,recipeItems]=await Promise.all([
      gateway.selectPage(C.tables.products,{page:1,pageSize:C.shadowPageSize,configure:q=>q.order?.('created_at',{ascending:true})?.order?.('id',{ascending:true})??q}),
      gateway.selectPage(C.tables.recipeItems,{page:1,pageSize:C.shadowPageSize,configure:q=>q.order?.('product_id',{ascending:true})?.order?.('ingredient_id',{ascending:true})?.order?.('id',{ascending:true})??q})
    ]);
    return Object.freeze({products,recipeItems});
  }

  return Object.freeze({schema:S,listProducts,listRecipeItems,readControlledShadow});
}
