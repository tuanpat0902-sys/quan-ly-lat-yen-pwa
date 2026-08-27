import {createMasterDataRepository} from './master-data-repository.js';
import {createMasterDataService} from './master-data-service.js';
import {MASTER_DATA_CONTRACT} from './master-data-contract.js';

export function createMasterDataDomain({gateway,cache,events,v2Adapter,getOrgId}){
  const repository=createMasterDataRepository({gateway});
  const service=createMasterDataService({repository,cache,events,v2Adapter,getOrgId});
  return Object.freeze({id:MASTER_DATA_CONTRACT.id,contract:MASTER_DATA_CONTRACT,repository,service});
}

export async function activate(context){
  const domain=createMasterDataDomain(context);
  return Object.freeze({
    domain,
    refreshShadow:()=>domain.service.refreshShadow(),
    deactivate:async()=>{}
  });
}
