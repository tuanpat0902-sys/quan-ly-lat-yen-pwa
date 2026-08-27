import {MASTER_DATA_CONTRACT} from './master-data-contract.js';

export function createMasterDataRepository({gateway}){
  if(!gateway)throw new Error('gateway is required');

  async function collectAll(table,configure){
    const rows=[];
    const pageSize=MASTER_DATA_CONTRACT.pageSize;
    for(let page=1;page<=100;page++){
      const result=await gateway.selectPage(table,{page,pageSize,configure});
      rows.push(...result.rows);
      if(result.rows.length<pageSize||rows.length>=result.count)break;
    }
    return rows;
  }

  const listWarehouses=()=>collectAll(MASTER_DATA_CONTRACT.tables.warehouses,q=>q.order?.('created_at',{ascending:true})??q);
  const listSuppliers=()=>collectAll(MASTER_DATA_CONTRACT.tables.suppliers,q=>q.order?.('name',{ascending:true})??q);

  return Object.freeze({listWarehouses,listSuppliers});
}
