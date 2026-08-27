import {createEmployeesRepository} from './employees-repository.js';
import {createEmployeesService} from './employees-service.js';
import {EMPLOYEES_CONTRACT} from './employees-contract.js';

export function createEmployeesDomain({source,v2Adapter,events}={}){
  const repository=createEmployeesRepository({source});
  const service=createEmployeesService({repository,v2Adapter,events});
  return Object.freeze({id:EMPLOYEES_CONTRACT.domain,contract:EMPLOYEES_CONTRACT,repository,service});
}

export {EMPLOYEES_CONTRACT,EMPLOYEES_MIGRATION_GUARD} from './employees-contract.js';
export {createEmployeesRepository,normalizeEmployeeDirectoryRow,EMPLOYEES_DIRECTORY_FIELDS} from './employees-repository.js';
export {createEmployeesService} from './employees-service.js';
export {compareEmployeeDirectory,EMPLOYEES_PARITY_FIELDS} from './parity.js';
