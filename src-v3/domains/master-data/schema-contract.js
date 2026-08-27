export const MASTER_DATA_SCHEMA=Object.freeze({
  warehouses:Object.freeze({
    table:'ly_warehouses',
    primaryKey:'id',
    order:Object.freeze(['created_at','id']),
    fields:Object.freeze(['id','org_id','name','address','active','created_at','updated_at'])
  }),
  suppliers:Object.freeze({
    table:'ly_suppliers',
    primaryKey:'id',
    order:Object.freeze(['name','id']),
    fields:Object.freeze(['id','org_id','name','phone','address','note','created_at','updated_at'])
  })
});

export function normalizeMasterDataRow(kind,row){
  const schema=MASTER_DATA_SCHEMA[kind];
  if(!schema)throw new Error(`Unknown master-data kind: ${kind}`);
  const out={};
  for(const key of schema.fields)out[key]=row?.[key]??null;
  return out;
}

export function normalizeMasterDataRows(kind,rows){
  const schema=MASTER_DATA_SCHEMA[kind];
  const list=(Array.isArray(rows)?rows:[]).map(row=>normalizeMasterDataRow(kind,row));
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
