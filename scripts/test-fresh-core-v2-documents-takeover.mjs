import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-documents-takeover.js',import.meta.url),'utf8');
const previousCalls=[];
const domainCalls=[];
const client={async rpc(name,params){previousCalls.push([name,params]);return {data:`previous:${name}`,error:null};}};

const mkDomain=label=>({
  async save(header,items){domainCalls.push([`${label}:save`,header,items]);return `${label}-id`;},
  async remove(id){domainCalls.push([`${label}:remove`,id]);return `${label}-removed`;}
});
const context={
  console,
  setTimeout(fn){fn();return 1;},
  clearTimeout(){},
  CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}},
  document:{readyState:'complete',addEventListener(){}},
  window:{
    sb:client,
    __lyFreshCoreV2:{domains:{imports:mkDomain('imports'),exports:mkDomain('exports'),stocktake:mkDomain('stocktake')}},
    dispatchEvent(){}
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-fresh-core-v2-documents-takeover.js'});

assert.equal(context.window.__lyFreshCoreV2DocumentsTakeover.status().enabled,true);
for(const [rpc,domain] of [['ly_save_import','imports'],['ly_save_export','exports'],['ly_save_stocktake','stocktake']]){
  const result=await client.rpc(rpc,{p_header:{code:rpc},p_items:[{qty:1}]});
  assert.equal(result.data,`${domain}-id`);
}
assert.equal(previousCalls.length,0,'document saves must not double-write through previous RPC chain');
assert.deepEqual(domainCalls.slice(0,3).map(x=>x[0]),['imports:save','exports:save','stocktake:save']);

await client.rpc('ly_delete_receipt',{p_type:'import',p_id:'i1'});
await client.rpc('ly_delete_receipt',{p_type:'export',p_id:'e1'});
await client.rpc('ly_delete_receipt',{p_type:'stocktake',p_id:'s1'});
assert.deepEqual(domainCalls.slice(3).map(x=>x[0]),['imports:remove','exports:remove','stocktake:remove']);
assert.equal(previousCalls.length,0,'V2 document deletes must not double-write');

const saleDelete=await client.rpc('ly_delete_receipt',{p_type:'sale',p_id:'sale1'});
assert.equal(saleDelete.data,'previous:ly_delete_receipt');
assert.equal(previousCalls.length,1,'sale delete must stay on previous chain until Sales takeover');

const product=await client.rpc('ly_save_product',{p_product:{name:'P'}});
assert.equal(product.data,'previous:ly_save_product');
assert.equal(previousCalls.length,2,'non-document RPCs must preserve prior takeover chain');

context.window.__lyFreshCoreV2DocumentsTakeover.disable();
await client.rpc('ly_save_import',{p_header:{code:'legacy'},p_items:[]});
assert.equal(previousCalls.length,3,'disable must restore previous RPC chain');
assert.equal(previousCalls[2][0],'ly_save_import');

console.log('Fresh Core V2 documents takeover: PASS');
