const DIRECTORY_RPC='ly_list_employee_directory';
const DIRECTORY_FIELDS=Object.freeze(['id','warehouse_id','code','name','role','shift','attendance_mode','active']);

function requiredId(value,label){
  const id=String(value||'').trim();
  if(!id)throw new Error(`${label} is required`);
  return id;
}

export function normalizeEmployeeDirectoryRow(row={}){
  const normalized={};
  for(const field of DIRECTORY_FIELDS)normalized[field]=row?.[field]??null;
  return Object.freeze(normalized);
}

export function createEmployeesRepository({gateway}){
  if(!gateway?.rpc)throw new Error('gateway.rpc is required');
  async function listDirectory({orgId,warehouseId}={}){
    const p_org_id=requiredId(orgId,'orgId');
    const p_warehouse_id=requiredId(warehouseId,'warehouseId');
    const data=await gateway.rpc(DIRECTORY_RPC,{p_org_id,p_warehouse_id});
    const rows=Array.isArray(data)?data:[];
    return Object.freeze(rows.map(normalizeEmployeeDirectoryRow));
  }
  const readOnly=()=>{throw new Error('Fresh Core V3 Employees repository is read-only');};
  return Object.freeze({
    mode:'read-only-safe-rpc',
    authoritative:false,
    rpc:DIRECTORY_RPC,
    fields:DIRECTORY_FIELDS,
    listDirectory,
    insertEmployee:readOnly,
    updateEmployee:readOnly,
    deleteEmployee:readOnly,
    saveAttendance:readOnly,
    savePayroll:readOnly
  });
}

export const EMPLOYEES_DIRECTORY_RPC=DIRECTORY_RPC;
export const EMPLOYEES_DIRECTORY_FIELDS=DIRECTORY_FIELDS;
