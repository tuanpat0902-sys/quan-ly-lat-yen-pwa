import {normalizeIngredientsInventoryRows} from './schema-contract.js';

function comparable(kind,rows){
  return normalizeIngredientsInventoryRows(kind,rows).map(row=>{
    const copy={...row};
    delete copy.updated_at;
    delete copy.created_at;
    return copy;
  });
}

export function compareIngredientsInventory(kind,v2Rows,v3Rows){
  const a=comparable(kind,v2Rows),b=comparable(kind,v3Rows);
  return Object.freeze({
    equal:JSON.stringify(a)===JSON.stringify(b),
    v2Count:a.length,
    v3Count:b.length
  });
}
