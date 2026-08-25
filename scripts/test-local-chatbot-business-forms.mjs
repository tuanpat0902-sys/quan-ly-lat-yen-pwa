import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../ly-local-chatbot.js',import.meta.url),'utf8');
const opened=[];
const kinds={
  import:{panel:'imports',formId:'inlineImportReceiptForm',toggleId:'toggleImportReceiptBtn',holderId:'importReceiptLines',rowSelector:'.import-receipt-line',select:'.irIngredient',quantity:'.irQty',noteId:'receiptNote'},
  export:{panel:'imports',formId:'inlineExportReceiptForm',toggleId:'toggleExportReceiptBtn',holderId:'exportReceiptLines',rowSelector:'.export-receipt-line',select:'.erIngredient',quantity:'.erQty',noteId:'exportReceiptReason'},
  stocktake:{panel:'stocktake',formId:'inlineStocktakeForm',toggleId:'toggleStocktakeBtn',holderId:'stocktakeReceiptLines',rowSelector:'.stocktake-receipt-line',quantity:'.srActual',noteId:'stocktakeReceiptNote'},
  sale:{panel:'sales',formId:'inlineSaleReceiptForm',toggleId:'toggleSaleReceiptBtn',holderId:'saleReceiptLines',rowSelector:'.sale-receipt-line',select:'.srProduct',quantity:'.srQty',noteId:'saleReceiptNote'}
};
const elements=new Map(),rows={import:[],export:[],stocktake:[],sale:[]};
const panelNodes=new Map(['imports','stocktake','sales','recipes','ingredients'].map(id=>[id,{classList:{active:false,contains(name){return name==='active'&&this.active;}}}]));
let securityOpen=false,securityPanel='',securityPolls=0;
const securityOverlay={classList:{contains(name){if(name!=='open'||!securityOpen)return false;if(++securityPolls>=2){securityOpen=false;for(const [id,node] of panelNodes)node.classList.active=id===securityPanel;}return securityOpen;}}};
function control(){return {value:'',dispatchEvent(){}};}
function makeRow(kind,id=''){
  const spec=kinds[kind],select=spec.select?control():null,quantity=control(),unitCost=control(),itemDiscountType=control(),itemDiscountValue=control(),row={dataset:kind==='stocktake'?{ingredientId:id}:{},querySelector(selector){if(selector===spec.select)return select;if(selector===spec.quantity)return quantity;if(selector==='.irUnitCost')return unitCost;if(selector==='.srItemDiscountType')return itemDiscountType;if(selector==='.srItemDiscountValue')return itemDiscountValue;return null;},remove(){const at=rows[kind].indexOf(row);if(at>=0)rows[kind].splice(at,1);}};return row;
}
function mountKind(kind){
  const spec=kinds[kind];rows[kind]=[];
  const classList={open:false,contains(name){return name==='open'&&this.open;}};
  const add={click(){rows[kind].push(makeRow(kind));}};
  const form={classList,querySelector(selector){return selector.includes('addImportReceiptLine')||selector.includes('addExportReceiptLine')||selector.includes('addSaleReceiptLine')?add:null;},scrollIntoView(){}};
  const holder={querySelectorAll(selector){return selector===spec.rowSelector?rows[kind]:[];}};
  const toggle={click(){classList.open=true;opened.push(kind);if(kind==='stocktake'&&!rows[kind].length){rows[kind].push(makeRow(kind,'i1'),makeRow(kind,'i2'));}else if(kind!=='stocktake'&&!rows[kind].length)add.click();}};
  elements.set(spec.formId,form);elements.set(spec.toggleId,toggle);elements.set(spec.holderId,holder);elements.set(spec.noteId,control());
}
for(const [id,panel] of panelNodes)elements.set(id,panel);
elements.set('lyMenuSecurityOverlay',securityOverlay);
for(const kind of Object.keys(kinds))mountKind(kind);
for(const id of ['receiptNo','receiptDate','exportReceiptNo','exportReceiptDate','stocktakeReceiptNo','stocktakeReceiptDate','saleReceiptNo','saleReceiptDate','saleDiscountType','saleDiscountValue'])elements.set(id,control());
const document={readyState:'loading',addEventListener(){},getElementById(id){return elements.get(id)||null;},querySelector(selector){const panel=selector.match(/data-panel="([^"]+)"/)?.[1];return panel?{click(){opened.push(`panel:${panel}`);if(['recipes','ingredients'].includes(panel)){securityOpen=true;securityPanel=panel;securityPolls=0;for(const node of panelNodes.values())node.classList.active=false;return;}for(const [id,node] of panelNodes)node.classList.active=id===panel;}}:null;},createElement(){return {};}};
const context={console,Date,Math,Promise,Intl,Event:class Event{},setTimeout(fn){fn();return 1;},document,window:{currentWarehouseId:'w1',db:{warehouses:[{id:'w1',name:'Kho chính'}],ingredients:[{id:'i1',warehouse_id:'w1',name:'Đường',unit:'kg',ingredient_type:'purchased'},{id:'i2',warehouse_id:'w1',name:'Sữa',unit:'lít',ingredient_type:'purchased'},{id:'i3',warehouse_id:'w1',name:'Bột cacao',unit:'g',ingredient_type:'purchased'},{id:'i4',warehouse_id:'w1',name:'Đá',unit:'kg',ingredient_type:'purchased'},{id:'i5',warehouse_id:'w1',name:'Nước đường',unit:'g',ingredient_type:'purchased'}],products:[{id:'p1',warehouse_id:'w1',name:'Cà phê sữa',unit:'ly'},{id:'p2',warehouse_id:'w1',name:'Cà phê đen',unit:'ly'}],recipeItems:[{product_id:'p1',ingredient_id:'i1'},{product_id:'p2',ingredient_id:'i1'}]}},globalThis:null};
const recipeRows=[],preparedRows=[];
const recipeName=control(),preparedName=control(),preparedOutput=control(),preparedUnit=control();
const recipeForm={classList:{open:false,contains(name){return name==='open'&&this.open;}},querySelectorAll(selector){return selector==='.recipe-line'?recipeRows:[];}};
const preparedPanel={classList:{open:false,contains(name){return name==='open'&&this.open;}},querySelectorAll(selector){return selector==='#preparedRecipeLines .recipe-line'?preparedRows:[];}};
const makeRecipeRow=()=>{const ingredient=control(),quantity=control();return {querySelector(selector){return selector==='.rlIng'?ingredient:selector==='.rlQty'?quantity:null;},remove(){const at=recipeRows.indexOf(this);if(at>=0)recipeRows.splice(at,1);}};};
const makePreparedRow=()=>{const ingredient=control(),quantity=control();return {querySelector(selector){return selector==='.prSource'?ingredient:selector==='.prQty'?quantity:null;},remove(){const at=preparedRows.indexOf(this);if(at>=0)preparedRows.splice(at,1);}};};
elements.set('inlineRecipeForm',recipeForm);elements.set('rpName',recipeName);elements.set('ingredientInlinePanel',preparedPanel);elements.set('igName',preparedName);elements.set('igBatchOutput',preparedOutput);elements.set('igUnit',preparedUnit);
context.window.openInlineRecipeForm=()=>{recipeForm.classList.open=true;recipeRows.splice(0,recipeRows.length,makeRecipeRow());opened.push('recipe');};context.window.addRecipeLine=()=>recipeRows.push(makeRecipeRow());
context.window.openIngredientInline=()=>{preparedPanel.classList.open=true;preparedRows.splice(0,preparedRows.length,makePreparedRow());opened.push('prepared');};context.window.addPreparedLine=()=>preparedRows.push(makePreparedRow());
context.globalThis=context;context.window.window=context.window;context.window.document=document;
vm.createContext(context);vm.runInContext(source,context);
const assistant=context.window.__lyLocalAssistant;

const importDraft=assistant.assistantReply('Tạo phiếu nhập 10 kg Đường và 3 lít Sữa').draft;
assert.ok(importDraft,'multi-item import command must produce a draft');assert.deepEqual(Array.from(importDraft.items,row=>[row.name,row.quantity]),[['Đường',10],['Sữa',3]]);await assistant.executeDraft(importDraft);
assert.equal(rows.import[0].querySelector('.irIngredient').value,'i1');assert.equal(rows.import[0].querySelector('.irQty').value,'10');assert.equal(rows.import[1].querySelector('.irIngredient').value,'i2');assert.equal(rows.import[1].querySelector('.irQty').value,'3');

const pricedImport=assistant.assistantReply('Nhập 1 kg Bột cacao, thành tiền nhập 100.000').draft;
assert.equal(pricedImport.items[0].quantity,1000,'kg must be converted to the ingredient base unit g');assert.equal(pricedImport.items[0].unit_cost,100,'total amount must derive unit cost after conversion');await assistant.executeDraft(pricedImport);assert.equal(rows.import[0].querySelector('.irQty').value,'1000');assert.equal(rows.import[0].querySelector('.irUnitCost').value,'100');

const exportDraft=assistant.assistantReply('Tạo phiếu xuất 5 kg Đường và 2 lít Sữa').draft;
assert.ok(exportDraft,'export command must produce a draft response');await assistant.executeDraft(exportDraft);
assert.equal(rows.export[0].querySelector('.erIngredient').value,'i1');assert.equal(rows.export[0].querySelector('.erQty').value,'5');assert.equal(elements.get('exportReceiptReason').value,'Bản nháp từ Trợ lý Lát Yên');
assert.equal(rows.export[1].querySelector('.erIngredient').value,'i2');assert.equal(rows.export[1].querySelector('.erQty').value,'2');

const stocktakeDraft=assistant.assistantReply('Tạo phiếu kiểm kê Đường 7 kg và Sữa 4 lít').draft;
assert.ok(stocktakeDraft,'stocktake command must produce a draft response');await assistant.executeDraft(stocktakeDraft);
assert.equal(rows.stocktake[0].querySelector('.srActual').value,'7');assert.equal(elements.get('stocktakeReceiptNote').value,'Bản nháp từ Trợ lý Lát Yên');
assert.equal(rows.stocktake[1].querySelector('.srActual').value,'4');

const saleDraft=assistant.assistantReply('Tạo phiếu bán 2 Cà phê sữa và 3 Cà phê đen').draft;
assert.ok(saleDraft,'sale command must produce a draft response');await assistant.executeDraft(saleDraft);
assert.equal(rows.sale[0].querySelector('.srProduct').value,'p1');assert.equal(rows.sale[0].querySelector('.srQty').value,'2');assert.equal(elements.get('saleReceiptNote').value,'Bản nháp từ Trợ lý Lát Yên');
assert.equal(rows.sale[1].querySelector('.srProduct').value,'p2');assert.equal(rows.sale[1].querySelector('.srQty').value,'3');

const recipeDraft=assistant.assistantReply('Tạo công thức tên món là Cacao sữa gồm 20g Bột cacao và 1 lít Sữa').draft;
await assistant.executeDraft(recipeDraft);assert.equal(recipeForm.classList.open,true);assert.equal(recipeName.value,'Cacao sữa');assert.deepEqual(recipeRows.map(row=>[row.querySelector('.rlIng').value,row.querySelector('.rlQty').value]),[['i3','20'],['i2','1']]);
const preparedDraft=assistant.assistantReply('Tạo nguyên liệu pha chế: Đường, bao gồm 10g đá, 10g nước đường, thành phẩm 20g đường').draft;
await assistant.executeDraft(preparedDraft);assert.equal(preparedPanel.classList.open,true);assert.equal(preparedName.value,'Đường');assert.equal(preparedOutput.value,'20');assert.equal(preparedUnit.value,'g');assert.deepEqual(preparedRows.map(row=>[row.querySelector('.prSource').value,row.querySelector('.prQty').value]),[['i5','10'],['i4','0.01']]);

const ambiguousSale=assistant.assistantReply('Tạo phiếu bán 2 cà phê').draft;
assert.ok(ambiguousSale);assert.equal(ambiguousSale.clarifications.length,1);assert.equal(ambiguousSale.clarifications[0].options.map(row=>row.name).join('|'),'Cà phê sữa|Cà phê đen');
await assert.rejects(()=>assistant.executeDraft(ambiguousSale),/cần chọn đúng mặt hàng/);
const wrongSale=assistant.assistantReply('Bán 10kg đường');
assert.ok(wrongSale.draft);assert.match(wrongSale.content,/không cần gửi lại câu lệnh/i);assert.deepEqual(Array.from(wrongSale.draft.clarifications[0].options,row=>row.name),['Cà phê sữa','Cà phê đen']);assert.equal(assistant.answerDraftClarification(wrongSale.draft,wrongSale.draft.clarifications[0].id,'p1'),true);assert.deepEqual(Array.from(wrongSale.draft.items,row=>[row.name,row.quantity]),[['Cà phê sữa',null]]);assert.equal(assistant.draftReady(wrongSale.draft),false);assert.ok(wrongSale.draft.clarifications.some(row=>row.type==='quantity'&&!row.resolved),'kg must not be silently treated as cups');
const missingSaleQuantity=assistant.assistantReply('Bán Cà phê sữa');
assert.ok(missingSaleQuantity.draft);assert.match(missingSaleQuantity.content,/chưa rõ số lượng/);const quantityChoice=missingSaleQuantity.draft.clarifications.find(row=>row.type==='quantity');assert.deepEqual(Array.from(quantityChoice.options,row=>row.label),['1 ly','5 ly','10 ly']);assert.equal(assistant.answerDraftClarification(missingSaleQuantity.draft,quantityChoice.id,'5'),true);assert.equal(missingSaleQuantity.draft.items[0].quantity,5);assert.equal(assistant.draftReady(missingSaleQuantity.draft),true);
const wrongExport=assistant.assistantReply('Xuất 3 kg Hạt matcha');
assert.equal(wrongExport.draft,undefined);assert.equal(wrongExport.localOnly,true);assert.match(wrongExport.content,/chưa tìm thấy nguyên liệu/i);assert.ok(!wrongExport.suggestions,'zero-relevance ingredients must never be suggested');
assert.equal(assistant.parseDraft('Xuất 3 kg Sữa').kind,'export');assert.equal(assistant.parseDraft('Bán 2 Cà phê sữa').kind,'sale');assert.equal(assistant.parseDraft('Kiểm kho 4 kg Đường').kind,'stocktake');
assert.ok(opened.includes('import')&&opened.includes('export')&&opened.includes('stocktake')&&opened.includes('sale')&&opened.includes('recipe')&&opened.includes('prepared'));
assert.ok(!source.includes('data-suggestion-message'),'all suggestion choices must update the draft immediately instead of refilling chat input');
assert.ok(source.includes("closest?.('[data-draft-choice],[data-confirm-draft]')"),'draft actions must resolve clicks from the button or any nested element');
assert.ok(source.includes("document.addEventListener('click',handleDraftActionClick,true)"),'draft actions must survive chat drawer rerenders through delegated capture handling');
console.log('Assistant unified multi-item business form contracts: PASS');
