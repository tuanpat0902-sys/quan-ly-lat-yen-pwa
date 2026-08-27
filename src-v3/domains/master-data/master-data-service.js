import {MASTER_DATA_CONTRACT} from './master-data-contract.js';

const normalizeRow=row=>{
  const out={};
  for(const key of Object.keys(row||{}).sort())if(key!=='updated_at'&&key!=='created_at')out[key]=row[key]??null;
  return out;
};
const normalizeRows=rows=>(Array.isArray(rows)?rows:[]).map(normalizeRow).sort((a,b)=>String(a.id??a.name??'').localeCompare(String(b.id??b.name??''),'vi'));

function compareRows(v2Rows,v3Rows){
  const left=normalizeRows(v2Rows),right=normalizeRows(v3Rows);
  const leftText=JSON.stringify(left),rightText=JSON.stringify(right);
  return Object.freeze({
    equal:leftText===rightText,
    v2Count:left.length,
    v3Count:right.length,
    onlyV2:left.filter(row=>!rightText.includes(JSON.stringify(row))).length,
    onlyV3:right.filter(row=>!leftText.includes(JSON.stringify(row))).length
  });
}

export function createMasterDataService({repository,cache,events,v2Adapter}){
  if(!repository||!cache||!events)throw new Error('repository, cache and events are required');

  async function refreshShadow(){
    const [warehouses,suppliers]=await Promise.all([repository.listWarehouses(),repository.listSuppliers()]);
    cache.set(MASTER_DATA_CONTRACT.cache.warehouses,warehouses,{ttlMs:60000,meta:{domain:'master-data'}});
    cache.set(MASTER_DATA_CONTRACT.cache.suppliers,suppliers,{ttlMs:60000,meta:{domain:'master-data'}});

    const v2State=v2Adapter?.getState?.()||{};
    const parity=Object.freeze({
      warehouses:compareRows(v2State.warehouses,warehouses),
      suppliers:compareRows(v2State.suppliers,suppliers)
    });
    const snapshot=Object.freeze({warehouses,suppliers,parity,authoritative:false,mode:'shadow'});
    events.emit('master-data:shadow-refreshed',snapshot);
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
