export const RECIPES_PRODUCTS_SCHEMA=Object.freeze({
  products:Object.freeze({
    table:'ly_products',
    primaryKey:'id',
    order:Object.freeze(['created_at','id']),
    fields:Object.freeze([
      'id','org_id','warehouse_id','name','sku','unit','selling_price','active',
      'created_at','updated_at','ipos_item_id','ipos_item_type_id','ipos_item_type_name',
      'ipos_item_class_id','ipos_item_class_name','ipos_last_synced_at'
    ])
  }),
  recipeItems:Object.freeze({
    table:'ly_recipe_items',
    primaryKey:'id',
    order:Object.freeze(['product_id','ingredient_id','id']),
    fields:Object.freeze([
      'id','org_id','product_id','ingredient_id','quantity','created_at','updated_at'
    ])
  })
});

export function normalizeRecipesProductsRow(kind,row){
  const schema=RECIPES_PRODUCTS_SCHEMA[kind];
  if(!schema)throw new Error(`Unknown recipes-products kind: ${kind}`);
  const out={};
  for(const key of schema.fields)out[key]=row?.[key]??null;
  return out;
}

export function normalizeRecipesProductsRows(kind,rows){
  const schema=RECIPES_PRODUCTS_SCHEMA[kind];
  const list=(Array.isArray(rows)?rows:[]).map(row=>normalizeRecipesProductsRow(kind,row));
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
