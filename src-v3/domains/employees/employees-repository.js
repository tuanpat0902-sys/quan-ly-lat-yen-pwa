const DIRECTORY_FIELDS=Object.freeze(['id','warehouse_id','code','name','role','shift','attendance_mode','active']);

export function normalizeEmployeeDirectoryRow(row={}){
  const normalized={};
  for(const field of DIRECTORY_FIELDS)normalized[field]=row?.[field]??null;
  return Object.freeze(normalized);
}

export function createEmployeesRepository({source}){
  if(!source?.listDirectory)throw new Error('source.listDirectory is required');
  async function listDirectory({orgId,warehouseId}={}){
    const rows=await source.listDirectory({orgId,warehouseId});
    return Object.freeze((Array.isArray(rows)?rows:[]).map(normalizeEmployeeDirectoryRow));
  }
  const readOnly=()=>{throw new Error('Fresh Core V3 Employees repository is read-only');};
  return Object.freeze({
    mode:'read-only-safe-source',
    authoritative:false,
    fields:DIRECTORY_FIELDS,
    listDirectory,
    insertEmployee:readOnly,
    updateEmployee:readOnly,
    deleteEmployee:readOnly,
    saveAttendance:readOnly,
    savePayroll:readOnly
  });
}

export const EMPLOYEES_DIRECTORY_FIELDS=DIRECTORY_FIELDS;
