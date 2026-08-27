export const RECIPES_PRODUCTS_CONTRACT=Object.freeze({
  domain:'recipes-products',
  mode:'shadow',
  authoritative:false,
  writes:false,
  tables:Object.freeze({products:'ly_products',recipeItems:'ly_recipe_items'}),
  cache:Object.freeze({products:'v3:recipes-products:products',recipeItems:'v3:recipes-products:recipe-items'}),
  pageSize:250,
  shadowPageSize:500
});
