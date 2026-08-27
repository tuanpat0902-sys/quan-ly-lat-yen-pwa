import {MASTER_DATA_CONTRACT} from './master-data-contract.js';
import {compareMasterData} from './parity.js';

export function createMasterDataService({repository,cache,events,v2Adapter,getOrgId}){
  if(!repository||!cache||!events)throw new Error('repository, cache and events are required');

  async function refreshShadow(){
    const [warehouses,suppliers]=await Promise.all([repository.listWarehouses(),repository.listSuppliers()]);
    cache.set(MASTER_DATA_CONTRACT.cache.warehouses,warehouses,{ttlMs:60000,meta:{domain:'master-data'}});
    cache.set(MASTER_DATA_CONTRACT.cache.suppliers,suppliers,{ttlMs:60000,meta:{domain:'master-data'}});

    const v2State=v2Adapter?.getState?.()||{};
    const orgId=getOrgId?.()??v2State.orgId??null;
    const parity=Object.freeze({
      warehouses:compareMasterData('warehouses',v2State.warehouses,warehouses,{orgId}),
      suppliers:compareMasterData('suppliers',v2State.suppliers,suppliers,{orgId})
    });
    const parityReady=parity.warehouses.equal&&parity.suppliers.equal;
    const snapshot=Object.freeze({warehouses,suppliers,parity,parityReady,authoritative:false,mode:'shadow'});
    events.emit('master-data:shadow-refreshed',snapshot);
    if(!parityReady)events.emit('master-data:parity-mismatch',parity);
    return snapshot;
  }

  function cached(){
    return Object.freeze({
      warehouses:cache.get(MASTER_DATA_CONTRACT.cache.warehouses,{allowStale:true})?.value??[],
      suppliers:cache.get(MASTER_DATA_CONTRACT.cache.suppliers,{allowStale:true})?.value??[]
    });
  }

  const readOnly=()=>{throw new Error('Fresh Core V3 Master Data is shadow read-only');};

  return Object.freeze({
    mode:'shadow',
    authoritative:false,
    refreshShadow,
    cached,
    saveWarehouse:readOnly,
    removeWarehouse:readOnly,
    saveSupplier:readOnly
  });
}
