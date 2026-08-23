import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-sales-takeover.js',import.meta.url),'utf8');
const previousCalls=[];
const salesCalls=[];
const client={async rpc(name,params){previousCalls.push([name,params]);return {data:`previous:${name}`,error:null};}};
const context={
  console,
  setTimeout(fn){fn();return 1;},
  clearTimeout(){},
  CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}},
  document:{readyState:'complete',addEventListener(){}},
  window:{
    sb:client,
    __lyFreshCoreV2:{domains:{sales:{
      async save(header,saleItems,stockLines){salesCalls.push(['save',header,saleItems,stockLines]);return 'sale-v2-id';},
      async remove(id){salesCalls.push(['remove',id]);return 'sale-removed';}
    }}},
    dispatchEvent(){}
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-fresh-core-v2-sales-takeover.js'});

assert.equal(context.window.__lyFreshCoreV2SalesTakeover.status().enabled,true);
const header={code:'S1'};
const saleItems=[{product_id:'p1',qty:2}];
const stockLines=[{ingredient_id:'i1',qty:3}];
const saved=await client.rpc('ly_save_sale',{p_header:header,p_sale_items:saleItems,p_stock_lines:stockLines});
assert.equal(saved.data,'sale-v2-id');
assert.deepEqual(salesCalls,[['save',header,saleItems,stockLines]]);
assert.equal(previousCalls.length,0,'sale save must not double-write');

const removed=await client.rpc('ly_delete_receipt',{p_type:'sale',p_id:'s1'});
assert.equal(removed.data,'sale-removed');
assert.deepEqual(salesCalls[1],['remove','s1']);
assert.equal(previousCalls.length,0,'sale delete must not double-write');

const importDelete=await client.rpc('ly_delete_receipt',{p_type:'import',p_id:'i1'});
assert.equal(importDelete.data,'previous:ly_delete_receipt');
assert.equal(previousCalls.length,1,'non-sale delete must preserve Documents takeover chain');

const product=await client.rpc('ly_save_product',{p_product:{name:'P'}});
assert.equal(product.data,'previous:ly_save_product');
assert.equal(previousCalls.length,2,'non-sale RPC must preserve previous takeover chain');

context.window.__lyFreshCoreV2SalesTakeover.disable();
await client.rpc('ly_save_sale',{p_header:{code:'legacy'},p_sale_items:[],p_stock_lines:[]});
assert.equal(previousCalls.length,3,'disable must restore previous RPC chain');
assert.equal(previousCalls[2][0],'ly_save_sale');

console.log('Fresh Core V2 sales takeover: PASS');
