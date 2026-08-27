import {compareEmployeeDirectory} from './parity.js';

export function createEmployeesService({repository,v2Adapter,events}={}){
  if(!repository)throw new Error('repository is required');
  async function evaluateDirectoryShadow({orgId,warehouseId,v2Employees}={}){
    const cloud=await repository.listDirectory({orgId,warehouseId});
    const legacy=Array.isArray(v2Employees)?v2Employees:(v2Adapter?.getEmployees?.()||[]);
    const parity=compareEmployeeDirectory(legacy,cloud,{warehouseId});
    const snapshot=Object.freeze({
      cloud,
      parity,
      parityReady:parity.equal,
      authoritative:false,
      mode:'manual-read-only-shadow',
      writes:0
    });
    events?.emit?.('employees:shadow-evaluated',snapshot);
    if(!parity.equal)events?.emit?.('employees:parity-mismatch',snapshot);
    return snapshot;
  }
  const readOnly=()=>{throw new Error('Fresh Core V3 Employees service is read-only');};
  return Object.freeze({
    mode:'manual-read-only-shadow',
    authoritative:false,
    autoRun:false,
    evaluateDirectoryShadow,
    saveEmployee:readOnly,
    saveAttendance:readOnly,
    savePayroll:readOnly
  });
}
