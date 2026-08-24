import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-legacy-hydration.js',import.meta.url),'utf8');
const snapshot={
 warehouses:[{id:'w1'}],suppliers:[{id:'s1'}],ingredients:[{id:'i1'}],preparedItems:[{id:'pi1'}],products:[{id:'p1'}],recipeItems:[{id:'r1'}],
 inventoryData:{balances:[{id:'inv1'}],transactions:[{id:'tx1'}]},
 importsData:{receipts:[{id:'ir1'}],items:[{id:'ii1'}]},exportsData:{receipts:[{id:'er1'}],items:[{id:'ei1'}]},stocktakeData:{receipts:[{id:'sr1'}],items:[{id:'si1'}]},
 salesData:{sales:[{id:'sale1'}],items:[{id:'salei1'}]},cashflowEntries:[{id:'c1',entry_type:'IN',entry_date:'2026-08-23',amount:'1250'}]
};
const db={};
let indexInvalidations=0;
const context={console,Date,db,invalidateDataIndexes(){indexInvalidations++;},window:{db,__lyFreshCoreV2:{store:{getState(){return snapshot;}}}}};context.globalThis=context;
vm.createContext(context);vm.runInContext(source,context,{filename:'ly-fresh-core-v2-legacy-hydration.js'});
const api=context.window.__lyFreshCoreV2LegacyHydration;
assert.ok(api);assert.equal(api.hydrate(),true);
for(const [key,id] of Object.entries({warehouses:'w1',suppliers:'s1',ingredients:'i1',preparedItems:'pi1',products:'p1',recipeItems:'r1',inventory:'inv1',movements:'tx1',sales:'sale1',saleItems:'salei1'}))assert.equal(db[key][0].id,id,`${key} projection must hydrate`);
assert.equal(context.window.__lyFreshHeaders.imports[0].id,'ir1');assert.equal(context.window.__lyFreshHeaders.importItems[0].id,'ii1');
assert.equal(context.window.__lyFreshHeaders.exports[0].id,'er1');assert.equal(context.window.__lyFreshHeaders.exportItems[0].id,'ei1');
assert.equal(context.window.__lyFreshHeaders.stocktakes[0].id,'sr1');assert.equal(context.window.__lyFreshHeaders.stocktakeItems[0].id,'si1');
assert.equal(context.window.__lyFreshHeaders.sales[0].id,'sale1');assert.equal(context.window.__lyFreshHeaders.saleItems[0].id,'salei1');assert.equal(context.window.__lyFreshHeaders.transactions[0].id,'tx1');
assert.deepEqual({...context.window.__lyFreshCashflow[0]},{id:'c1',entry_type:'IN',entry_date:'2026-08-23',amount:1250,type:'IN',date:'2026-08-23'});
assert.notEqual(db.products,snapshot.products,'hydration must copy arrays instead of aliasing V2 state');
assert.equal(indexInvalidations,1,'hydration must invalidate cached receipt indexes before any render');
assert.equal(api.status().hydrates,1);
console.log('Fresh Core V2 Legacy hydration bridge: PASS');
