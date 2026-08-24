import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../ly-local-chatbot.js',import.meta.url),'utf8');
const opened=[];
const kinds={
  export:{panel:'imports',formId:'inlineExportReceiptForm',toggleId:'toggleExportReceiptBtn',holderId:'exportReceiptLines',rowSelector:'.export-receipt-line',select:'.erIngredient',quantity:'.erQty',noteId:'exportReceiptReason'},
  stocktake:{panel:'stocktake',formId:'inlineStocktakeForm',toggleId:'toggleStocktakeBtn',holderId:'stocktakeReceiptLines',rowSelector:'.stocktake-receipt-line',quantity:'.srActual',noteId:'stocktakeReceiptNote'},
  sale:{panel:'sales',formId:'inlineSaleReceiptForm',toggleId:'toggleSaleReceiptBtn',holderId:'saleReceiptLines',rowSelector:'.sale-receipt-line',select:'.srProduct',quantity:'.srQty',noteId:'saleReceiptNote'}
};
const elements=new Map(),rows={export:[],stocktake:[],sale:[]};
function control(){return {value:'',dispatchEvent(){}};}
function makeRow(kind,id=''){
  const spec=kinds[kind],select=spec.select?control():null,quantity=control(),row={dataset:kind==='stocktake'?{ingredientId:id}:{},querySelector(selector){if(selector===spec.select)return select;if(selector===spec.quantity)return quantity;return null;},remove(){const at=rows[kind].indexOf(row);if(at>=0)rows[kind].splice(at,1);}};return row;
}
for(const [kind,spec] of Object.entries(kinds)){
  const classList={open:false,contains(name){return name==='open'&&this.open;}};
  const add={click(){rows[kind].push(makeRow(kind));}};
  const form={classList,querySelector(selector){return selector.includes('addExportReceiptLine')||selector.includes('addSaleReceiptLine')?add:null;},scrollIntoView(){}};
  const holder={querySelectorAll(selector){return selector===spec.rowSelector?rows[kind]:[];}};
  const toggle={click(){classList.open=true;opened.push(kind);if(kind==='stocktake'&&!rows[kind].length){rows[kind].push(makeRow(kind,'i1'),makeRow(kind,'i2'));}else if(kind!=='stocktake'&&!rows[kind].length)add.click();}};
  elements.set(spec.panel,{});elements.set(spec.formId,form);elements.set(spec.toggleId,toggle);elements.set(spec.holderId,holder);elements.set(spec.noteId,control());
}
for(const id of ['exportReceiptNo','exportReceiptDate','stocktakeReceiptNo','stocktakeReceiptDate','saleReceiptNo','saleReceiptDate'])elements.set(id,control());
const document={readyState:'loading',addEventListener(){},getElementById(id){return elements.get(id)||null;},querySelector(selector){const panel=selector.match(/data-panel="([^"]+)"/)?.[1];return panel?{click(){opened.push(`panel:${panel}`);}}:null;},createElement(){return {};}};
const context={console,Date,Math,Promise,Intl,Event:class Event{},setTimeout(fn){fn();return 1;},document,window:{currentWarehouseId:'w1',db:{warehouses:[{id:'w1',name:'Kho chính'}],ingredients:[{id:'i1',warehouse_id:'w1',name:'Đường',unit:'kg',ingredient_type:'purchased'},{id:'i2',warehouse_id:'w1',name:'Sữa',unit:'lít',ingredient_type:'purchased'}],products:[{id:'p1',warehouse_id:'w1',name:'Cà phê sữa',unit:'ly'},{id:'p2',warehouse_id:'w1',name:'Cà phê đen',unit:'ly'}],recipeItems:[{product_id:'p1',ingredient_id:'i1'},{product_id:'p2',ingredient_id:'i1'}]}},globalThis:null};
context.globalThis=context;context.window.window=context.window;context.window.document=document;
vm.createContext(context);vm.runInContext(source,context);
const assistant=context.window.__lyLocalAssistant;

const exportDraft=assistant.assistantReply('Tạo phiếu xuất 5 kg Đường').draft;
assert.ok(exportDraft,'export command must produce a draft response');await assistant.executeDraft(exportDraft);
assert.equal(rows.export[0].querySelector('.erIngredient').value,'i1');assert.equal(rows.export[0].querySelector('.erQty').value,'5');assert.equal(elements.get('exportReceiptReason').value,'Bản nháp từ Trợ lý Lát Yên');

const stocktakeDraft=assistant.assistantReply('Tạo phiếu kiểm kê Đường 7 kg').draft;
assert.ok(stocktakeDraft,'stocktake command must produce a draft response');await assistant.executeDraft(stocktakeDraft);
assert.equal(rows.stocktake[0].querySelector('.srActual').value,'7');assert.equal(elements.get('stocktakeReceiptNote').value,'Bản nháp từ Trợ lý Lát Yên');

const saleDraft=assistant.assistantReply('Tạo phiếu bán 2 Cà phê sữa').draft;
assert.ok(saleDraft,'sale command must produce a draft response');await assistant.executeDraft(saleDraft);
assert.equal(rows.sale[0].querySelector('.srProduct').value,'p1');assert.equal(rows.sale[0].querySelector('.srQty').value,'2');assert.equal(elements.get('saleReceiptNote').value,'Bản nháp từ Trợ lý Lát Yên');

const ambiguousSale=assistant.assistantReply('Tạo phiếu bán 2 cà phê').draft;
assert.ok(ambiguousSale);assert.equal(ambiguousSale.ambiguities.length,1);assert.equal(ambiguousSale.ambiguities[0].options.map(row=>row.name).join('|'),'Cà phê sữa|Cà phê đen');
await assert.rejects(()=>assistant.executeDraft(ambiguousSale),/cần chọn đúng mặt hàng/);
const wrongSale=assistant.assistantReply('Bán 10kg đường');
assert.equal(wrongSale.draft,undefined);assert.equal(wrongSale.localOnly,true);assert.match(wrongSale.content,/chưa tìm thấy món “Đường”/i);assert.deepEqual(Array.from(wrongSale.suggestions,row=>row.label),['Cà phê sữa','Cà phê đen']);assert.equal(wrongSale.suggestions[0].value,'Bán Cà phê sữa');
const missingSaleQuantity=assistant.assistantReply('Bán Cà phê sữa');
assert.equal(missingSaleQuantity.draft,undefined);assert.equal(missingSaleQuantity.localOnly,true);assert.match(missingSaleQuantity.content,/chưa rõ số lượng/);assert.deepEqual(Array.from(missingSaleQuantity.suggestions,row=>row.label),['1 ly','5 ly','10 ly']);
const wrongExport=assistant.assistantReply('Xuất 3 kg Bột cacao');
assert.equal(wrongExport.draft,undefined);assert.equal(wrongExport.localOnly,true);assert.match(wrongExport.content,/chưa tìm thấy nguyên liệu/);assert.ok(wrongExport.suggestions.length>0);
assert.equal(assistant.parseDraft('Xuất 3 kg Sữa').kind,'export');assert.equal(assistant.parseDraft('Bán 2 Cà phê sữa').kind,'sale');assert.equal(assistant.parseDraft('Kiểm kho 4 kg Đường').kind,'stocktake');
assert.ok(opened.includes('export')&&opened.includes('stocktake')&&opened.includes('sale'));
console.log('Assistant export, stocktake, and sale form contracts: PASS');
