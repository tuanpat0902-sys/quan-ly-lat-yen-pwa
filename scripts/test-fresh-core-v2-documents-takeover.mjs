import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-documents-takeover.js',import.meta.url),'utf8');
const previousCalls=[];const domainCalls=[];let loadCalls=0;let inventoryRefreshes=0;
const client={async rpc(name,params){previousCalls.push([name,params]);return {data:`previous:${name}`,error:null};}};
let state={importsData:{receipts:[{id:'i'}],items:[{receipt_id:'i'}]},exportsData:{receipts:[{id:'e'}],items:[{receipt_id:'e'}]},stocktakeData:{receipts:[{id:'s'}],items:[{receipt_id:'s'}]},inventoryData:{balances:[{ingredient_id:'x',quantity:4}],transactions:[{id:'t1'}]}};
const mkDomain=label=>({async save(header,items){domainCalls.push([`${label}:save`,header,items]);return `${label}-id`;},async remove(id){domainCalls.push([`${label}:remove`,id]);return `${label}-removed`;}});
const context={console,setTimeout(fn){fn();return 1;},clearTimeout(){},CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}},document:{readyState:'complete',addEventListener(){}},window:{sb:client,__lyFreshHeaders:{},__lyFreshCoreV2:{store:{getState(){return state;}},domains:{imports:mkDomain('imports'),exports:mkDomain('exports'),stocktake:mkDomain('stocktake'),inventory:{async refresh(){inventoryRefreshes++;return state.inventoryData;}}},},dispatchEvent(){}}};
context.db={inventory:[],movements:[]};context.invalidateDerivedCaches=()=>{};context.loadCloud=async()=>{loadCalls++;return {legacy:true};};context.globalThis=context;
vm.createContext(context);vm.runInContext(source,context,{filename:'ly-fresh-core-v2-documents-takeover.js'});
assert.equal(context.window.__lyFreshCoreV2DocumentsTakeover.status().enabled,true);
for(const [rpc,domain] of [['ly_save_import','imports'],['ly_save_export','exports'],['ly_save_stocktake','stocktake']]){const r=await client.rpc(rpc,{p_header:{code:rpc},p_items:[{qty:1}]});assert.equal(r.data,`${domain}-id`);await context.loadCloud();}
assert.equal(previousCalls.length,0);assert.equal(inventoryRefreshes,3);assert.equal(loadCalls,0,'post-document full reloads must be suppressed');
assert.equal(context.window.__lyFreshHeaders.imports[0].id,'i');assert.equal(context.window.__lyFreshHeaders.exportItems[0].receipt_id,'e');assert.equal(context.db.inventory[0].quantity,4);assert.equal(context.db.movements[0].id,'t1');
await client.rpc('ly_delete_receipt',{p_type:'import',p_id:'i1'});await context.loadCloud();assert.equal(inventoryRefreshes,4);assert.equal(loadCalls,0);
const saleDelete=await client.rpc('ly_delete_receipt',{p_type:'sale',p_id:'sale1'});assert.equal(saleDelete.data,'previous:ly_delete_receipt');await context.loadCloud();assert.equal(loadCalls,1,'non-document RPC must not arm suppression');
context.window.__lyFreshCoreV2DocumentsTakeover.disable();await client.rpc('ly_save_import',{p_header:{code:'legacy'},p_items:[]});assert.equal(previousCalls.at(-1)[0],'ly_save_import');await context.loadCloud();assert.equal(loadCalls,2,'disable must restore original loadCloud');
console.log('Fresh Core V2 documents takeover: PASS');