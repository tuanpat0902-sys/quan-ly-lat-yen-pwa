export const INGREDIENTS_INVENTORY_CONTRACT=Object.freeze({
  domain:'ingredients-inventory',
  mode:'shadow',
  authoritative:false,
  tables:Object.freeze({ingredients:'ingredients',inventory:'inventory'}),
  cache:Object.freeze({ingredients:'v3:ingredients-inventory:ingredients',inventory:'v3:ingredients-inventory:inventory'}),
  pageSize:100
});
