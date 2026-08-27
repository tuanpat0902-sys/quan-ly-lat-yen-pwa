const DIRECTORY_RPC='ly_list_employee_directory';

export function createEmployeesDirectorySource({gateway}){
  if(!gateway?.rpc)throw new Error('gateway.rpc is required');
  async function listDirectory({orgId,warehouseId}={}){
    const p_org_id=String(orgId||'').trim();
    const p_warehouse_id=String(warehouseId||'').trim();
    if(!p_org_id)throw new Error('orgId is required');
    if(!p_warehouse_id)throw new Error('warehouseId is required');
    const data=await gateway.rpc(DIRECTORY_RPC,{p_org_id,p_warehouse_id});
    return Array.isArray(data)?data:[];
  }
  return Object.freeze({listDirectory,rpcName:DIRECTORY_RPC});
}

export const EMPLOYEES_DIRECTORY_RPC=DIRECTORY_RPC;
