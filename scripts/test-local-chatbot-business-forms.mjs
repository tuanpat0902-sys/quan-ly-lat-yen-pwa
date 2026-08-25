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
const panelNodes=new Map(['imports','stocktake','sales','recipes','ingredients','cashflow'].map(id=>[id,{classList:{active:false,contains(name){return name==='active'&&this.active;}}}]));
let securityOpen=false,securityPanel='',securityPolls=0;
const securityOverlay={classList:{contains(name){if(name!=='open'||!securityOpen)return false;if(++securityPolls>=2){securityOpen=false;for(const [id,node] of panelNodes)node.classList.active=id===securityPanel;}return securityOpen;}}};
function control(){return {value:'',dispatchEvent(){}};}
function makeRow(kind,id=''){
  const spec=kinds[kind],select=spec.select?control():null,quantity=control(),unitCost=control(),itemDiscountType=control(),itemDiscountValue=control(),row={dataset:kind==='stocktake'?{ingredientId:id}:{},querySelector(selector){if(selector===spec.select)return select;if(selector===spec.quantity)return quantity;if(selector==='.irUnitCost'||selector==='.erUnitCost')return unitCost;if(selector==='.srItemDiscountType')return itemDiscountType;if(selector==='.srItemDiscountValue')return itemDiscountValue;return null;},remove(){const at=rows[kind].indexOf(row);if(at>=0)rows[kind].splice(at,1);}};return row;
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
const context={console,Date,Math,Promise,Intl,Event:class Event{},setTimeout(fn){fn();return 1;},document,window:{currentWarehouseId:'w1',db:{warehouses:[{id:'w1',name:'Kho chính'}],ingredients:[{id:'i1',warehouse_id:'w1',name:'Đường',unit:'kg',ingredient_type:'purchased'},{id:'i2',warehouse_id:'w1',name:'Sữa',unit:'lít',ingredient_type:'purchased'},{id:'i3',warehouse_id:'w1',name:'Bột cacao',unit:'g',ingredient_type:'purchased'},{id:'i4',warehouse_id:'w1',name:'Đá',unit:'kg',ingredient_type:'purchased'},{id:'i5',warehouse_id:'w1',name:'Nước đường',unit:'g',ingredient_type:'purchased'},{id:'i6',warehouse_id:'w1',name:'Syrup me',unit:'g',ingredient_type:'prepared'}],products:[{id:'p1',warehouse_id:'w1',name:'Cà phê sữa',unit:'ly'},{id:'p2',warehouse_id:'w1',name:'Cà phê đen',unit:'ly'}],recipeItems:[{product_id:'p1',ingredient_id:'i1'},{product_id:'p2',ingredient_id:'i1'}]}},globalThis:null};
const recipeRows=[],preparedRows=[];
const recipeName=control(),recipeUnit=control(),recipePrice=control(),preparedName=control(),preparedOutput=control(),preparedUnit=control(),ingredientMinimum=control(),cashflowType=control(),cashflowCategory=control(),cashflowAmount=control(),cashflowNote=control(),cashflowDate=control();
const recipeForm={classList:{open:false,contains(name){return name==='open'&&this.open;}},querySelectorAll(selector){return selector==='.recipe-line'?recipeRows:[];}};
const preparedPanel={dataset:{type:''},classList:{open:false,contains(name){return name==='open'&&this.open;}},querySelectorAll(selector){return selector==='#preparedRecipeLines .recipe-line'?preparedRows:[];},scrollIntoView(){}};
const makeRecipeRow=()=>{const ingredient=control(),quantity=control();return {querySelector(selector){return selector==='.rlIng'?ingredient:selector==='.rlQty'?quantity:null;},remove(){const at=recipeRows.indexOf(this);if(at>=0)recipeRows.splice(at,1);}};};
const makePreparedRow=()=>{const ingredient=control(),quantity=control();return {querySelector(selector){return selector==='.prSource'?ingredient:selector==='.prQty'?quantity:null;},remove(){const at=preparedRows.indexOf(this);if(at>=0)preparedRows.splice(at,1);}};};
elements.set('inlineRecipeForm',recipeForm);elements.set('recipeLines',{});elements.set('rpName',recipeName);elements.set('rpUnit',recipeUnit);elements.set('rpPrice',recipePrice);elements.set('ingredientInlinePanel',preparedPanel);elements.set('preparedRecipeLines',{});elements.set('igName',preparedName);elements.set('igBatchOutput',preparedOutput);elements.set('igUnit',preparedUnit);elements.set('igMin',ingredientMinimum);elements.set('cashflowType',cashflowType);elements.set('cashflowCategory',cashflowCategory);elements.set('cashflowAmount',cashflowAmount);elements.set('cashflowNote',cashflowNote);elements.set('cashflowDate',cashflowDate);
let recipeOpenAttempts=0;context.window.openInlineRecipeForm=()=>{if(++recipeOpenAttempts===1)return;recipeForm.classList.open=true;recipeRows.splice(0,recipeRows.length,makeRecipeRow());opened.push('recipe');};context.window.addRecipeLine=()=>recipeRows.push(makeRecipeRow());
let preparedOpenAttempts=0;context.window.openIngredientInline=(_,type)=>{if(type==='prepared'&&++preparedOpenAttempts===1)return;preparedPanel.dataset.type=type;preparedPanel.classList.open=true;if(type==='prepared')preparedRows.splice(0,preparedRows.length,makePreparedRow());opened.push(type);};context.window.addPreparedLine=()=>preparedRows.push(makePreparedRow());context.window.toggleCashflowForm=()=>opened.push('cashflow');
context.globalThis=context;context.window.window=context.window;context.window.document=document;
vm.createContext(context);vm.runInContext(source,context);
const assistant=context.window.__lyLocalAssistant;

const importDraft=assistant.assistantReply('Tạo phiếu nhập 10 kg Đường và 3 lít Sữa').draft;
assert.ok(importDraft,'multi-item import command must produce a draft');assert.deepEqual(Array.from(importDraft.items,row=>[row.name,row.quantity]),[['Đường',10],['Sữa',3]]);await assistant.executeDraft(importDraft);
assert.equal(rows.import[0].querySelector('.irIngredient').value,'i1');assert.equal(rows.import[0].querySelector('.irQty').value,'10');assert.equal(rows.import[1].querySelector('.irIngredient').value,'i2');assert.equal(rows.import[1].querySelector('.irQty').value,'3');
const replacementImport=assistant.assistantReply('Tạo phiếu nhập 4 kg Đường').draft;await assistant.executeDraft(replacementImport);assert.equal(rows.import.length,1,'a new command must discard all unsaved lines from the previous open import form');assert.equal(rows.import[0].querySelector('.irIngredient').value,'i1');assert.equal(rows.import[0].querySelector('.irQty').value,'4');

const pricedImport=assistant.assistantReply('Nhập 1 kg Bột cacao, thành tiền nhập 100.000').draft;
assert.equal(pricedImport.items[0].quantity,1000,'kg must be converted to the ingredient base unit g');assert.equal(pricedImport.items[0].unit_cost,100,'total amount must derive unit cost after conversion');await assistant.executeDraft(pricedImport);assert.equal(rows.import[0].querySelector('.irQty').value,'1000');assert.equal(rows.import[0].querySelector('.irUnitCost').value,'100');
const convertedPriceImport=assistant.assistantReply('Nhập 10 kg Bột cacao đơn giá 10 nghìn').draft;assert.equal(convertedPriceImport.items[0].quantity,10000);assert.equal(convertedPriceImport.items[0].unit_cost,10);await assistant.executeDraft(convertedPriceImport);assert.equal(rows.import[0].querySelector('.irQty').value,'10000');assert.equal(rows.import[0].querySelector('.irUnitCost').value,'10','the real form must receive the converted base-unit price');
const multiPriceImport=assistant.assistantReply('Nhập 15kg đá đơn giá 10 nghìn, 15kg bột cacao giá 12 nghìn, 1,2l sữa giá 30 nghìn').draft;await assistant.executeDraft(multiPriceImport);const importByIngredient=id=>rows.import.find(row=>row.querySelector('.irIngredient').value===id);assert.equal(importByIngredient('i4').querySelector('.irUnitCost').value,'10000');assert.equal(importByIngredient('i3').querySelector('.irUnitCost').value,'12');assert.equal(importByIngredient('i2').querySelector('.irUnitCost').value,'30000','each import form row must receive its own parsed unit price');

const exportDraft=assistant.assistantReply('Tạo phiếu xuất 5 kg Đường và 2 lít Sữa').draft;
assert.ok(exportDraft,'export command must produce a draft response');await assistant.executeDraft(exportDraft);
assert.equal(rows.export[0].querySelector('.erIngredient').value,'i1');assert.equal(rows.export[0].querySelector('.erQty').value,'5');assert.equal(elements.get('exportReceiptReason').value,'Bản nháp từ Trợ lý Lát Yên');
assert.equal(rows.export[1].querySelector('.erIngredient').value,'i2');assert.equal(rows.export[1].querySelector('.erQty').value,'2');
const replacementExport=assistant.assistantReply('Tạo phiếu xuất 1 kg Đường').draft;await assistant.executeDraft(replacementExport);assert.equal(rows.export.length,1);assert.equal(rows.export[0].querySelector('.erIngredient').value,'i1');assert.equal(rows.export[0].querySelector('.erQty').value,'1');
const pricedExportReply=assistant.assistantReply('Xuất 10 kg Đá đơn giá 10 nghìn'),pricedExport=pricedExportReply.draft;assert.equal(pricedExport.items[0].unit_cost,10000);assert.match(pricedExportReply.content,/10\.000 đ\/kg/);await assistant.executeDraft(pricedExport);assert.equal(rows.export[0].querySelector('.erUnitCost').value,'10000','export unit price must be written to the real business form');
const convertedPriceExport=assistant.assistantReply('Xuất 10 kg Bột cacao đơn giá 10 nghìn').draft;assert.equal(convertedPriceExport.items[0].unit_cost,10);await assistant.executeDraft(convertedPriceExport);assert.equal(rows.export[0].querySelector('.erUnitCost').value,'10','export forms must receive the same converted base-unit price');
const multiPriceExport=assistant.assistantReply('Xuất 15kg đá đơn giá 10 nghìn, 15kg bột cacao giá 12 nghìn, 5l sữa giá 8 nghìn').draft;await assistant.executeDraft(multiPriceExport);const exportByIngredient=id=>rows.export.find(row=>row.querySelector('.erIngredient').value===id);assert.equal(exportByIngredient('i4').querySelector('.erUnitCost').value,'10000');assert.equal(exportByIngredient('i3').querySelector('.erUnitCost').value,'12');assert.equal(exportByIngredient('i2').querySelector('.erUnitCost').value,'8000','each export form row must receive its own parsed unit price');

const stocktakeDraft=assistant.assistantReply('Tạo phiếu kiểm kê Đường 7 kg và Sữa 4 lít').draft;
assert.ok(stocktakeDraft,'stocktake command must produce a draft response');await assistant.executeDraft(stocktakeDraft);
assert.equal(rows.stocktake[0].querySelector('.srActual').value,'7');assert.equal(elements.get('stocktakeReceiptNote').value,'Bản nháp từ Trợ lý Lát Yên');
assert.equal(rows.stocktake[1].querySelector('.srActual').value,'4');

const saleDraft=assistant.assistantReply('Tạo phiếu bán 2 Cà phê sữa và 3 Cà phê đen').draft;
assert.ok(saleDraft,'sale command must produce a draft response');await assistant.executeDraft(saleDraft);
assert.equal(rows.sale[0].querySelector('.srProduct').value,'p1');assert.equal(rows.sale[0].querySelector('.srQty').value,'2');assert.equal(elements.get('saleReceiptNote').value,'Bản nháp từ Trợ lý Lát Yên');
assert.equal(rows.sale[1].querySelector('.srProduct').value,'p2');assert.equal(rows.sale[1].querySelector('.srQty').value,'3');
const discountedSale=assistant.assistantReply('Tạo phiếu bán 1 Cà phê sữa giảm giá tổng hóa đơn 10%').draft;await assistant.executeDraft(discountedSale);assert.equal(elements.get('saleDiscountValue').value,'10');const replacementSale=assistant.assistantReply('Tạo phiếu bán 1 Cà phê đen').draft;await assistant.executeDraft(replacementSale);assert.equal(rows.sale.length,1);assert.equal(rows.sale[0].querySelector('.srProduct').value,'p2');assert.equal(elements.get('saleDiscountValue').value,'0','a new sale command must clear an unsaved discount from the previous form');
const cupSale=assistant.assistantReply('Bán 15 cốc cà phê sữa và 15 cốc cà phê đen giảm giá mỗi món 5%').draft;assert.deepEqual(Array.from(cupSale.items,row=>[row.quantity,row.discount?.value]),[[15,5],[15,5]]);await assistant.executeDraft(cupSale);assert.equal(rows.sale[0].querySelector('.srQty').value,'15');assert.equal(rows.sale[1].querySelector('.srQty').value,'15');

const recipeDraft=assistant.assistantReply('Tạo công thức tên món là Cacao sữa gồm 20g Bột cacao và 1 lít Sữa').draft;
await assistant.executeDraft(recipeDraft);assert.equal(recipeForm.classList.open,true);assert.equal(recipeName.value,'Cacao sữa');assert.deepEqual(recipeRows.map(row=>[row.querySelector('.rlIng').value,row.querySelector('.rlQty').value]),[['i3','20'],['i2','1']]);
const pricedRecipeDraft=assistant.assistantReply('Tạo công thức: YẾN YẾN đơn vị là cốc, bao gồm 10g đá và 10g nước đường, giá bán 100 nghìn').draft;await assistant.executeDraft(pricedRecipeDraft);assert.equal(recipeName.value,'YẾN YẾN');assert.equal(recipeUnit.value,'cốc');assert.equal(recipePrice.value,'100000');
const preparedDraft=assistant.assistantReply('Tạo nguyên liệu pha chế: Đường, bao gồm 10g đá, 10g nước đường, thành phẩm 20g đường').draft;
await assistant.executeDraft(preparedDraft);assert.equal(preparedPanel.classList.open,true);assert.equal(preparedName.value,'Đường');assert.equal(preparedOutput.value,'20');assert.equal(preparedUnit.value,'g');assert.deepEqual(preparedRows.map(row=>[row.querySelector('.prSource').value,row.querySelector('.prQty').value]),[['i5','10'],['i4','0.01']]);
const replacementPrepared=assistant.assistantReply('Tạo nguyên liệu pha chế: Syrup sữa, gồm 20g đường, thành phẩm 20g').draft;await assistant.executeDraft(replacementPrepared);assert.equal(preparedName.value,'Syrup sữa');assert.equal(preparedRows.length,1);assert.equal(preparedRows[0].querySelector('.prSource').value,'i1');
const nestedPrepared=assistant.assistantReply('Tạo nguyên liệu pha chế: Nước mía bao gồm 10g đá và 10g syrup me').draft;await assistant.executeDraft(nestedPrepared);assert.equal(preparedName.value,'Nước mía');assert.deepEqual(preparedRows.map(row=>[row.querySelector('.prSource').value,row.querySelector('.prQty').value]),[['i6','10'],['i4','0.01']]);

const ingredientDraft=assistant.assistantReply('Tạo nguyên liệu: Bột quế, đơn vị g, tồn tối thiểu 100g').draft;
assert.ok(ingredientDraft);assert.equal(ingredientDraft.name,'Bột quế');await assistant.executeDraft(ingredientDraft);assert.equal(preparedPanel.dataset.type,'purchased');assert.equal(preparedName.value,'Bột quế');assert.equal(preparedUnit.value,'g');assert.equal(ingredientMinimum.value,'100');

const cashflowReply=assistant.assistantReply('Tạo phiếu thu/chi "tiền điện" 10 nghìn');
assert.ok(cashflowReply.draft);assert.equal(cashflowReply.draft.amount,10000);const categoryChoice=cashflowReply.draft.clarifications.find(row=>row.type==='cashflow_category');assert.ok(categoryChoice);assert.ok(categoryChoice.options.some(row=>row.label==='Chi · Điện'));const electric=categoryChoice.options.find(row=>row.category==='Điện');assert.equal(assistant.answerDraftClarification(cashflowReply.draft,categoryChoice.id,electric.id),true);assert.equal(assistant.draftReady(cashflowReply.draft),true);await assistant.executeDraft(cashflowReply.draft);assert.equal(cashflowType.value,'expense');assert.equal(cashflowCategory.value,'Điện');assert.equal(cashflowAmount.value,'10000');
const waterReply=assistant.assistantReply('Tạo phiếu chi tiền nước 200k');const waterChoice=waterReply.draft.clarifications[0],water=waterChoice.options.find(row=>row.category==='Nước');assert.ok(water);assistant.answerDraftClarification(waterReply.draft,waterChoice.id,water.id);await assistant.executeDraft(waterReply.draft);assert.equal(cashflowCategory.value,'Nước','a new cashflow command must replace the category in the already-open unsaved form');assert.equal(cashflowAmount.value,'200000');
const unknownExpense=assistant.assistantReply('Tạo phiếu chi "phí vệ sinh lạ" 20k').draft;assert.ok(unknownExpense);assert.equal(unknownExpense.category,undefined);assert.ok(unknownExpense.clarifications[0].options.some(row=>row.category==='Chi phí khác'),'unknown expense content must offer a safe fallback instead of guessing');
const missingMoney=assistant.assistantReply('Tạo phiếu chi tiền điện');assert.equal(missingMoney.localOnly,true);assert.match(missingMoney.content,/chưa đọc được số tiền/i);

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
assert.ok(opened.includes('import')&&opened.includes('export')&&opened.includes('stocktake')&&opened.includes('sale')&&opened.includes('recipe')&&opened.includes('prepared')&&opened.includes('purchased')&&opened.includes('cashflow'));
assert.ok(!source.includes('data-suggestion-message'),'all suggestion choices must update the draft immediately instead of refilling chat input');
assert.ok(source.includes("closest?.('[data-draft-choice],[data-confirm-draft],[data-assistant-suggestion]')"),'draft and suggestion actions must resolve clicks from the button or any nested element');
assert.ok(source.includes('await submitContent(target.dataset.assistantSuggestion)'),'a clarification suggestion must execute immediately instead of refilling the chat input');
assert.ok(source.includes("document.addEventListener('click',handleDraftActionClick,true)"),'draft actions must survive chat drawer rerenders through delegated capture handling');
assert.ok(source.includes('if(ready)await openDraftMessage(message.draft.id,target)'),'the final suggestion choice must immediately open the business form for confirmation');
assert.ok(source.includes("window.matchMedia?.('(max-width: 520px)')"),'mobile form opening must detect the phone viewport');assert.ok(source.includes("document.querySelector?.('#inlineImportReceiptForm.open,#inlineExportReceiptForm.open,#inlineStocktakeForm.open,#inlineSaleReceiptForm.open,#inlineRecipeForm.open,#ingredientInlinePanel.open,.cashflow-entry-card')"),'all business forms must trigger automatic chat hiding on phones');assert.ok(source.includes("Promise.resolve().then(()=>hideAssistantForMobileForm())"),'mobile chat hiding must also cover manually opened forms without adding a background observer');
console.log('Assistant unified multi-item business form contracts: PASS');
