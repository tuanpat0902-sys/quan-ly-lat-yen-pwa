import assert from 'node:assert/strict';
import {createMasterDataRepository} from '../src-v3/domains/master-data/master-data-repository.js';
import {createMasterDataService} from '../src-v3/domains/master-data/master-data-service.js';
import {createQueryCache} from '../src-v3/core/cache/query-cache.js';
import {EventBus} from '../src-v3/core/events/event-bus.js';
import {canonicalUnit,convertStandardUnit,unitsCompatible,UNIT_CATALOG} from '../src-v3/domains/master-data/units.js';

const rowsByTable={
  ly_warehouses:[
    {id:'w1',name:'Kho A',org_id:'org-1',created_at:'2026-01-01T00:00:00Z'},
    {id:'w2',name:'Kho B',org_id:'org-1',created_at:'2026-01-02T00:00:00Z'}
  ],
  ly_suppliers:[
    {id:'s1',name:'Nhà cung cấp A',org_id:'org-1'},
    {id:'s2',name:'Nhà cung cấp B',org_id:'org-1'}
  ]
};

function fakeQuery(table){
  const state={pageFrom:0,pageTo:49,orderKey:''};
  const api={
    select(){return api;},
    eq(){return api;},
    order(key){state.orderKey=key;return api;},
    range(from,to){state.pageFrom=from;state.pageTo=to;return Promise.resolve(result());}
  };
  function result(){
    let rows=[...(rowsByTable[table]||[])];
    if(state.orderKey)rows.sort((a,b)=>String(a[state.orderKey]??'').localeCompare(String(b[state.orderKey]??''),'vi'));
    return {data:rows.slice(state.pageFrom,state.pageTo+1),error:null,count:rows.length};
  }
  return api;
}

const client={
  from(table){return fakeQuery(table);},
  rpc(){throw new Error('RPC must not be used in V3-1 shadow mode');}
};

const {createGateway}=await import('../src-v3/data/supabase/gateway.js');
const gateway=createGateway({
  client,getOrgId:()=> 'org-1',
  allowedTables:new Set(['ly_warehouses','ly_suppliers']),
  allowedRpcs:new Set()
});

const repository=createMasterDataRepository({gateway});
assert.equal((await repository.listWarehouses()).length,2);
assert.equal((await repository.listSuppliers())[0].name,'Nhà cung cấp A');

const cache=createQueryCache();
const events=new EventBus();
let emitted=null;
events.on('master-data:shadow-refreshed',payload=>emitted=payload);
const v2Adapter={getState:()=>({
  warehouses:rowsByTable.ly_warehouses,
  suppliers:rowsByTable.ly_suppliers
})};
const service=createMasterDataService({repository,cache,events,v2Adapter,getOrgId:()=> 'org-1'});
const snapshot=await service.refreshShadow();
assert.equal(snapshot.authoritative,false);
assert.equal(snapshot.mode,'shadow');
assert.equal(snapshot.parityReady,true);
assert.equal(snapshot.parity.warehouses.equal,true);
assert.equal(snapshot.parity.suppliers.equal,true);
assert.equal(emitted.parity.warehouses.equal,true);
assert.deepEqual(snapshot.parity.warehouses.missingInV3,[]);
assert.deepEqual(snapshot.parity.suppliers.changed,[]);
assert.equal(service.cached().warehouses.length,2);
assert.throws(()=>service.saveWarehouse({id:'x'}),/shadow read-only/);

assert.equal(canonicalUnit('kilo'),'kg');
assert.equal(unitsCompatible('g','kg'),true);
assert.equal(convertStandardUnit(1,'kg','g'),1000);
assert.ok(UNIT_CATALOG.length>=20);

const mismatchService=createMasterDataService({
  repository,
  cache:createQueryCache(),
  events:new EventBus(),
  getOrgId:()=> 'org-1',
  v2Adapter:{getState:()=>({warehouses:[...rowsByTable.ly_warehouses,{id:'missing',org_id:'org-1',name:'Kho thiếu'}],suppliers:rowsByTable.ly_suppliers})}
});
const mismatch=await mismatchService.refreshShadow();
assert.equal(mismatch.parityReady,false);
assert.deepEqual(mismatch.parity.warehouses.missingInV3,['missing']);

const wrongOrgService=createMasterDataService({
  repository:{listWarehouses:async()=>[{...rowsByTable.ly_warehouses[0],org_id:'other-org'}],listSuppliers:async()=>rowsByTable.ly_suppliers},
  cache:createQueryCache(),
  events:new EventBus(),
  getOrgId:()=> 'org-1',
  v2Adapter:{getState:()=>({warehouses:rowsByTable.ly_warehouses,suppliers:rowsByTable.ly_suppliers})}
});
const wrongOrg=await wrongOrgService.refreshShadow();
assert.equal(wrongOrg.parity.warehouses.equal,false);
assert.deepEqual(wrongOrg.parity.warehouses.invalidOrgRows,['w1']);

console.log('Fresh Core V3 Master Data shadow: PASS');
