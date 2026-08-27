export const MASTER_DATA_CONTRACT=Object.freeze({
  id:'master-data',
  migrationWave:'V3-1',
  mode:'shadow',
  authoritative:false,
  tables:Object.freeze({
    warehouses:'ly_warehouses',
    suppliers:'ly_suppliers'
  }),
  cache:Object.freeze({
    warehouses:'master-data:warehouses',
    suppliers:'master-data:suppliers'
  }),
  pageSize:250
});
