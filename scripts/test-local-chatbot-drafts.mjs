import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../ly-local-chatbot.js',import.meta.url),'utf8');
assert.ok(source.includes("DB_NAME='lat_yen_local_assistant_v1'"));
assert.ok(source.includes('indexedDB.open(DB_NAME,1)'));
assert.ok(source.includes('Dữ liệu chat chỉ nằm trên thiết bị này')||source.includes('Lịch sử chat và đề xuất chỉ lưu trên thiết bị này'));
assert.ok(!source.includes('localStorage'),'assistant history must not use LocalStorage');
for(const forbidden of [".rpc(",".from(",'saveImportReceipt?.','saveExportReceipt?.','saveStocktakeReceipt?.','saveSaleReceipt?.'])assert.ok(!source.includes(forbidden),`assistant must not directly commit business data: ${forbidden}`);

const elements=new Map([
  ['importReceiptLines',{cleared:false,replaceChildren(){this.cleared=true;}}],
  ['receiptNote',{value:''}]
]);
const opened=[];
const document={
  readyState:'loading',addEventListener(){},querySelector(){return null;},
  getElementById(id){return elements.get(id)||null;},
  createElement(){return {appendChild(){},setAttribute(){},addEventListener(){},classList:{toggle(){}},dataset:{}};}
};
const context={console,Date,Math,Promise,setTimeout(fn){fn();return 1;},document,window:{
  currentWarehouseId:'w1',db:{warehouses:[{id:'w1',name:'Kho chính'}],ingredients:[{id:'i1',name:'Đường',ingredient_type:'purchased'}],products:[{id:'p1',name:'Cà phê sữa'}]},
  showTab(panel){opened.push(['panel',panel]);},renderImports(){opened.push(['render']);},toggleImportReceiptForm(value){opened.push(['form',value]);},addImportReceiptLine(...args){opened.push(['line',...args]);}
},globalThis:null};
context.globalThis=context;context.window.window=context.window;context.window.document=document;
vm.createContext(context);vm.runInContext(source,context);
const assistant=context.window.__lyLocalAssistant;

const create=assistant.parseDraft('Tạo phiếu nhập 10 kg Đường');
assert.equal(create.action,'create');assert.equal(create.kind,'import');assert.equal(create.warehouse_id,'w1');assert.equal(create.items[0].id,'i1');assert.equal(create.items[0].quantity,10);
await assistant.executeDraft(create);
assert.equal(create.status,'opened');assert.equal(elements.get('importReceiptLines').cleared,true);assert.equal(elements.get('receiptNote').value,'Bản nháp từ Trợ lý Lát Yên');
assert.deepEqual(opened.map(row=>row[0]),['panel','render','form','line']);assert.equal(opened.at(-1)[1],'i1');assert.equal(opened.at(-1)[3],10);
const remove=assistant.parseDraft('Xóa phiếu kiểm kê số KK-001');
assert.equal(remove.action,'delete');assert.equal(remove.kind,'stocktake');assert.equal(remove.receipt_code,'KK-001');
const edit=assistant.parseDraft('Sửa phiếu bán BH-009');
assert.equal(edit.action,'edit');assert.equal(edit.kind,'sale');assert.equal(edit.receipt_code,'BH-009');
assert.equal(assistant.parseDraft('Cho tôi xem tồn kho'),null);

console.log('Device-only assistant draft and confirmation contract: PASS');
