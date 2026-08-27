export const INGREDIENTS_INVENTORY_SCHEMA=Object.freeze({
  ingredients:Object.freeze({
    table:'ly_ingredients',
    primaryKey:'id',
    order:Object.freeze(['created_at','id']),
    fields:Object.freeze([
      'id','org_id','code','name','unit','ingredient_type','batch_output_qty',
      'cost','minimum_stock','active','created_at','updated_at',
      'purchase_unit','conversion_ratio'
    ])
  }),
  inventory:Object.freeze({
    table:'ly_inventory',
    primaryKey:Object.freeze(['warehouse_id','ingredient_id']),
    order:Object.freeze(['warehouse_id','ingredient_id']),
    fields:Object.freeze(['org_id','warehouse_id','ingredient_id','quantity','updated_at'])
  })
});

export function normalizeIngredientsInventoryRow(kind,row){
  const schema=INGREDIENTS_INVENTORY_SCHEMA[kind];
  if(!schema)throw new Error(`Unknown ingredients-inventory kind: ${kind}`);
  const out={};
  for(const key of schema.fields)out[key]=row?.[key]??null;
  return out;
}

export function normalizeIngredientsInventoryRows(kind,rows){
  const schema=INGREDIENTS_INVENTORY_SCHEMA[kind];
  const list=(Array.isArray(rows)?rows:[]).map(row=>normalizeIngredientsInventoryRow(kind,row));
  return list.sort((a,b)=>{
    for(const key of schema.order){
      const av=String(a?.[key]??'').toLocaleLowerCase('vi');
      const bv=String(b?.[key]??'').toLocaleLowerCase('vi');
      const result=av.localeCompare(bv,'vi');
      if(result)return result;
    }
    return 0;
  });
}
