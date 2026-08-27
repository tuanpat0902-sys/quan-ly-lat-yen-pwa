import {INGREDIENTS_INVENTORY_CONTRACT as C} from './ingredients-inventory-contract.js';
import {INGREDIENTS_INVENTORY_SCHEMA as S} from './schema-contract.js';

export function createIngredientsInventoryRepository({gateway}){
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
  const listIngredients=()=>collectAll(C.tables.ingredients,q=>q.order?.('created_at',{ascending:true})?.order?.('id',{ascending:true})??q);
  const listInventory=()=>collectAll(C.tables.inventory,q=>q.order?.('warehouse_id',{ascending:true})?.order?.('ingredient_id',{ascending:true})??q);
  return Object.freeze({schema:S,listIngredients,listInventory});
}
