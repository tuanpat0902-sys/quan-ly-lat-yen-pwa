import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-cashflow-takeover.js',import.meta.url),'utf8');
const previousFromCalls=[];
const mutations=[];
const renders=[];
let legacyLoadCalls=0;
let indexInvalidations=0;
let entries=[{id:'existing',warehouse_id:'w1',entry_type:'expense',entry_date:'2026-08-23',category:'Old',amount:10,note:'x'}];

function rawTable(name){
  return {
    select(){return {eq(){return this;},single:async()=>({data:{id:'verify'},error:null}),maybeSingle:async()=>({data:null,error:null})};},
    upsert:async row=>{mutations.push(['raw-upsert',row]);return {data:row,error:null};},
    delete(){mutations.push(['raw-delete']);return {eq(){return this;},then(resolve){return Promise.resolve({data:null,error:null}).then(resolve);}};}
  };
}

const client={from(name){previousFromCalls.push(name);return rawTable(name);},async rpc(){return {data:null,error:null};}};
const cashflowCalls=[];
const store={getState(){return {cashflowEntries:entries,marker:'v2'};}};
const context={
  console,
  setTimeout(fn){fn();return 1;},clearTimeout(){},
  CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}},
  document:{readyState:'complete',addEventListener(){}},
  window:{
    sb:client,
    loadCloud:async()=>{legacyLoadCalls++;return {legacy:true};},
    invalidateDataIndexes(){indexInvalidations++;renders.push('invalidate-indexes');},
    invalidateDerivedCaches(){renders.push('invalidate-derived');},
    renderCashflow(){renders.push('cashflow');},
    renderCashflowReport(){renders.push('report');},
    __lyFreshCoreV2:{
      store,
      domains:{cashflow:{
        async refresh(){cashflowCalls.push(['refresh']);return entries;},
        async create(entry){cashflowCalls.push(['create',entry]);entries=[...entries,entry];return entry;},
        async update(id,entry){cashflowCalls.push(['update',id,entry]);entries=entries.map(x=>x.id===id?entry:x);return entry;},
        async remove(id){cashflowCalls.push(['remove',id]);const row=entries.find(x=>x.id===id)||null;entries=entries.filter(x=>x.id!==id);return row;}
      }}
    },
    dispatchEvent(){}
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-fresh-core-v2-cashflow-takeover.js'});

const api=context.window.__lyFreshCoreV2CashflowTakeover;
assert.equal(api.status().enabled,true);

const created={id:'new',warehouse_id:'w1',entry_type:'income',entry_date:'2026-08-23',category:'Sale',amount:100,note:''};
const createResult=await client.from('ly_cashflow_entries').upsert(created,{onConflict:'id'});
assert.equal(createResult.error,null);
assert.deepEqual(cashflowCalls.slice(0,2),[['refresh'],['create',created]]);
assert.equal(mutations.length,0,'cashflow create must not hit previous raw mutation path');
assert.equal(context.window.__lyFreshCashflow.at(-1).type,'income');
assert.equal(context.window.__lyFreshCashflow.at(-1).date,'2026-08-23');
assert.equal(context.window.__lyFreshCashflow.at(-1).amount,100);
assert.ok(indexInvalidations>=1,'cashflow mutation must invalidate shared cached projections');

const suppressedCreateReload=await context.window.loadCloud();
assert.equal(legacyLoadCalls,0,'immediate post-create loadCloud must be suppressed');
assert.equal(suppressedCreateReload.marker,'v2');
assert.equal(api.status().suppressedReloads,1);
assert.ok(renders.includes('cashflow'),'cashflow UI must be re-rendered from hydrated V2 projection');

await context.window.loadCloud();
assert.equal(legacyLoadCalls,1,'suppression must be one-shot so later/manual loadCloud remains available');

const edited={id:'existing',warehouse_id:'w1',entry_type:'expense',entry_date:'2026-08-23',category:'Edit',amount:200,note:'y'};
const updateResult=await client.from('ly_cashflow_entries').upsert(edited,{onConflict:'id'});
assert.equal(updateResult.error,null);
assert.deepEqual(cashflowCalls.slice(2,4),[['refresh'],['update','existing',edited]]);
assert.equal(mutations.length,0,'cashflow update must not double-write');
await context.window.loadCloud();
assert.equal(legacyLoadCalls,1,'immediate post-update loadCloud must be suppressed');

const deleteResult=await client.from('ly_cashflow_entries').delete().eq('id','existing').eq('org_id','org-1');
assert.equal(deleteResult.error,null);
assert.deepEqual(cashflowCalls[4],['remove','existing']);
assert.equal(mutations.length,0,'cashflow delete must not double-write');
assert.equal(context.window.__lyFreshCashflow.some(x=>x.id==='existing'),false);
await context.window.loadCloud();
assert.equal(legacyLoadCalls,1,'immediate post-delete loadCloud must be suppressed');

const verify=await client.from('ly_cashflow_entries').select('id').eq('id','new').single();
assert.equal(verify.error,null,'cashflow SELECT verify must pass through raw table');
const other=client.from('ly_products');await other.upsert({id:'p1'});
assert.deepEqual(mutations,[['raw-upsert',{id:'p1'}]],'non-cashflow table must preserve previous from chain');

api.disable();
await client.from('ly_cashflow_entries').upsert({id:'legacy'});
assert.equal(mutations.length,2,'disable must restore previous from chain');
assert.deepEqual(mutations[1],['raw-upsert',{id:'legacy'}]);
await context.window.loadCloud();
assert.equal(legacyLoadCalls,2,'disable must restore original loadCloud');

console.log('Fresh Core V2 cashflow takeover: PASS');
