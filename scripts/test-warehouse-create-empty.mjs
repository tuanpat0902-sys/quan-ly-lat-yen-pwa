import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../ly-warehouse-delete-ux.js',import.meta.url),'utf8');
const calls=[];
let refreshes=0,closed=0,notice='';
const elements=new Map([
  ['wName',{value:'Kho mới'}],
  ['wAddress',{value:'Địa chỉ mới'}],
  ['wPasswordEnabled',{checked:false,dataset:{}}],
  ['wCurrentPassword',{value:''}],
  ['wNewPassword',{value:''}],
  ['wConfirmPassword',{value:''}],
  ['saveWarehouseBtn',{disabled:false,textContent:'Tạo kho mới'}]
]);
const client={
  async rpc(name,args){
    calls.push(['rpc',name,args]);
    return {data:{id:'warehouse-new',has_password:false},error:null};
  },
  from(table){
    calls.push(['from',table]);
    throw new Error(`Warehouse creation must not write ${table}`);
  }
};
const context={
  console,
  document:{getElementById(id){return elements.get(id)||null;}},
  setTimeout(){return 1;},
  alert(message){throw new Error(`Unexpected alert: ${message}`);},
  closeModal(){closed++;},
  toastMsg(message){notice=message;},
  async loadCloud(){refreshes++;},
  db:{ingredients:[
    {id:'ingredient-1',ingredient_type:'purchased'},
    {id:'ingredient-2',ingredient_type:'purchased'}
  ]},
  window:{
    sb:client,
    __lyFreshOrgId:'org-1',
    addEventListener(){},
    openModal(){}
  }
};
context.window.window=context.window;
context.window.document=context.document;
context.window.db=context.db;
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context);

await context.window.saveWarehouse('');

assert.deepEqual(calls.map(call=>call[0]),['rpc'],'creating a warehouse must only call the secure warehouse RPC');
assert.equal(calls[0][1],'ly_save_warehouse_secure');
assert.equal(calls[0][2].p_warehouse.id,null);
assert.equal(calls[0][2].p_warehouse.name,'Kho mới');
assert.equal(calls[0][2].p_warehouse.address,'Địa chỉ mới');
assert.equal(calls[0][2].p_warehouse.active,true);
assert.equal(context.window.currentWarehouseId,'warehouse-new');
assert.equal(refreshes,1,'successful creation must refresh Cloud state once');
assert.equal(closed,1,'successful creation must close the form');
assert.equal(notice,'Đã tạo kho mới');
assert.equal(elements.get('saveWarehouseBtn').disabled,false);
assert.equal(elements.get('saveWarehouseBtn').textContent,'Tạo kho mới');
assert.ok(!source.includes("from('ly_inventory')"),'warehouse owner must not create zero-balance ingredient membership rows');

console.log('Warehouse creation starts empty: PASS');
