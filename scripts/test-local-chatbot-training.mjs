import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../ly-local-chatbot.js',import.meta.url),'utf8');
const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');
const appVersion=await fs.readFile(new URL('../ly-app-version.js',import.meta.url),'utf8');
const document={readyState:'loading',addEventListener(){},getElementById(){return null;},querySelector(){return null;}};
const context={console,Date,Math,Promise,Intl,document,window:{currentWarehouseId:'w1',db:{warehouses:[{id:'w1',name:'Kho chính'}],ingredients:[{id:'i1',warehouse_id:'w1',name:'Đá',unit:'kg',ingredient_type:'purchased'},{id:'i2',warehouse_id:'w1',name:'Đường',unit:'g',ingredient_type:'purchased'},{id:'i3',warehouse_id:'w1',name:'Sữa',unit:'ml',ingredient_type:'purchased'},{id:'i4',warehouse_id:'w1',name:'Trà',unit:'ml',ingredient_type:'purchased'},{id:'i5',warehouse_id:'w1',name:'Nước đường',unit:'g',ingredient_type:'purchased'},{id:'i6',warehouse_id:'w1',name:'Syrup me',unit:'g',ingredient_type:'prepared'},{id:'i7',warehouse_id:'w1',name:'Đá viên tinh khiết',unit:'g',ingredient_type:'purchased'}],products:[{id:'p1',warehouse_id:'w1',name:'Yến nâu',unit:'ly'},{id:'p2',warehouse_id:'w1',name:'Yến đậm',unit:'ly'},{id:'p3',warehouse_id:'w1',name:'Trà thanh xoài',unit:'ly'}]}},globalThis:null,setTimeout};
context.globalThis=context;context.window.window=context.window;context.window.document=document;
vm.createContext(context);vm.runInContext(source,context);const assistant=context.window.__lyLocalAssistant;

const imported=assistant.parseDraft('Nhập 10kg đá với đơn giá nhập là 10 nghìn');
assert.equal(imported.kind,'import');assert.equal(imported.items[0].unit_cost,10000,'must understand import unit price expressed in thousands');
const importTotal=assistant.parseDraft('Nhập 10kg đá, thành tiền nhập 100.000');
assert.equal(importTotal.items[0].unit_cost,10000,'must derive unit cost from total import amount and quantity');
const convertedImport=assistant.parseDraft('Nhập 1kg đường, thành tiền nhập 100.000');
assert.equal(convertedImport.items[0].quantity,1000,'kg must be converted to the ingredient base unit g');assert.equal(convertedImport.items[0].unit_cost,100,'derived unit cost must use the converted base quantity');
const convertedUnitPrice=assistant.assistantReply('Nhập 10kg đá viên tinh khiết đơn giá 10 nghìn');
assert.equal(convertedUnitPrice.draft.items[0].quantity,10000);assert.equal(convertedUnitPrice.draft.items[0].unit_cost,10,'10,000 VND/kg must become 10 VND/g when the form stores grams');assert.match(convertedUnitPrice.content,/10 kg → 10\.000 g/);assert.match(convertedUnitPrice.content,/10 đ\/g · thành tiền 100\.000 đ/);
const convertedExportPrice=assistant.parseDraft('Xuất 10kg đá viên tinh khiết giá xuất 10 nghìn');assert.equal(convertedExportPrice.items[0].unit_cost,10,'export unit prices must use the same unit conversion rule');
const multiImportPrices=assistant.parseDraft('Nhập 15kg đá đơn giá 10 nghìn, 15kg đường giá 12 nghìn, 1,2l sữa giá 30 nghìn');
assert.deepEqual(Array.from(multiImportPrices.items,row=>[row.name,row.quantity,row.unit_cost]),[['Đường',15000,12],['Sữa',1200,30],['Đá',15,10000]],'each import line must keep its own price and unit conversion');
const multiExportPrices=assistant.parseDraft('Xuất 15kg đá đơn giá 10 nghìn, 15kg đường giá 12 nghìn, 5l sữa giá 8 nghìn');
assert.deepEqual(Array.from(multiExportPrices.items,row=>[row.name,row.quantity,row.unit_cost]),[['Đường',15000,12],['Sữa',5000,8],['Đá',15,10000]],'each export line must keep its own price and unit conversion');
const exportedReply=assistant.assistantReply('Xuất 10kg đá đơn giá 10 nghìn'),exported=exportedReply.draft;
assert.equal(exported.items[0].unit_cost,10000,'must understand export unit price expressed in thousands');assert.match(exportedReply.content,/10\.000 đ\/kg/,'export confirmation must show the understood price');

const sale=assistant.parseDraft('Bán 10 ly yến nâu, có giảm giá tổng hóa đơn 10%');
assert.equal(sale.receipt_discount.type,'percent');assert.equal(sale.receipt_discount.value,10,'must preserve receipt-level percent discount');
const itemSale=assistant.parseDraft('Bán 2 ly yến nâu, giảm giá từng món 5 nghìn');
assert.equal(itemSale.items[0].discount.type,'amount');assert.equal(itemSale.items[0].discount.value,5000,'must preserve per-item amount discount');
const cupSale=assistant.parseDraft('Bán 15 cốc yến nâu');assert.equal(cupSale.items[0].quantity,15,'cốc must be understood as the product unit ly without asking again');
const multiCupSale=assistant.parseDraft('Bán 15 cốc yến nâu và 15 cốc trà thanh xoài và 15 cốc yến đậm giảm giá mỗi món 5%');assert.deepEqual(Array.from(multiCupSale.items,row=>[row.name,row.quantity,row.discount?.value]),[['Trà thanh xoài',15,5],['Yến nâu',15,5],['Yến đậm',15,5]],'all cup quantities and item discounts must survive a multi-product command');

const stocktake=assistant.assistantReply('Tạo phiếu kiểm kê kho').draft;
assert.ok(stocktake?.open_blank,'a generic stocktake request must open the real stocktake form instead of being searched as an ingredient');assert.equal(assistant.draftReady(stocktake),true);

const recipe=assistant.parseDraft('Tạo công thức tên món là Yên Lát bao gồm 10g Đường, 10ml Sữa, 10ml Trà');
assert.equal(recipe.kind,'recipe');assert.equal(recipe.name,'Yên Lát');assert.deepEqual(Array.from(recipe.items,row=>[row.name,row.quantity]),[['Đường',10],['Sữa',10],['Trà',10]]);
const pricedRecipe=assistant.assistantReply('Tạo công thức: YẾN YẾN đơn vị là cốc, bao gồm 10g đá và 10g nước đường, giá bán 100 nghìn');assert.equal(pricedRecipe.draft.name,'YẾN YẾN');assert.equal(pricedRecipe.draft.unit,'cốc');assert.equal(pricedRecipe.draft.selling_price,100000);assert.match(pricedRecipe.content,/đơn vị cốc · giá bán 100\.000 đ/);
const prepared=assistant.parseDraft('Tạo nguyên liệu pha chế tên là Syrup đường bao gồm 100g Đường');
assert.equal(prepared.kind,'prepared');assert.equal(prepared.name,'Syrup đường');assert.equal(prepared.items[0].id,'i2');
const preparedExample=assistant.parseDraft('Tạo nguyên liệu pha chế: Đường, bao gồm 10g đá, 10g nước đường, thành phẩm 20g đường');
assert.equal(preparedExample.name,'Đường');assert.deepEqual(Array.from(preparedExample.items,row=>[row.name,row.quantity]),[['Nước đường',10],['Đá',0.01]]);assert.equal(preparedExample.batch_output,20);assert.equal(preparedExample.unit,'g');assert.ok(!preparedExample.items.some(row=>row.id==='i2'),'output name and output phrase must not be treated as source ingredients');
const preparedFrom=assistant.parseDraft('Tạo nguyên liệu pha chế tên là Syrup sữa từ 200ml sữa, 50g đường; sản lượng 230ml Syrup sữa');
assert.equal(preparedFrom.name,'Syrup sữa');assert.deepEqual(Array.from(preparedFrom.items,row=>[row.name,row.quantity]),[['Đường',50],['Sữa',200]]);assert.equal(preparedFrom.batch_output,230);assert.equal(preparedFrom.unit,'ml');
const preparedOverlap=assistant.parseDraft('Tạo nguyên liệu pha chế: Nước đường đậm, gồm 5g đường và 15g nước đường, cho ra 18g nước đường đậm');
assert.equal(preparedOverlap.name,'Nước đường đậm');assert.deepEqual(Array.from(preparedOverlap.items,row=>row.name),['Nước đường','Đường']);assert.equal(preparedOverlap.batch_output,18);assert.ok(!preparedOverlap.items.some(row=>row.name==='Nước đường đậm'));
const preparedSymbols=assistant.parseDraft('Tạo nguyên liệu pha chế Syrup đá: 10g đá + 20g đường => 25g');
assert.equal(preparedSymbols.name,'Syrup đá');assert.deepEqual(Array.from(preparedSymbols.items,row=>[row.name,row.quantity]),[['Đường',20],['Đá',0.01]]);assert.equal(preparedSymbols.batch_output,25);assert.equal(preparedSymbols.unit,'g');
const preparedNatural=assistant.parseDraft('Tạo nguyên liệu pha chế tên là Nền trà dùng trà 100ml, đường 15g, thu được 110ml');
assert.equal(preparedNatural.name,'Nền trà');assert.deepEqual(Array.from(preparedNatural.items,row=>[row.name,row.quantity]),[['Đường',15],['Trà',100]]);assert.equal(preparedNatural.batch_output,110);assert.equal(preparedNatural.unit,'ml');
const preparedFromPrepared=assistant.assistantReply('Tạo nguyên liệu pha chế: Nước mía bao gồm 10g đá và 10g syrup me');
assert.ok(preparedFromPrepared.draft);assert.equal(assistant.draftReady(preparedFromPrepared.draft),true,'an existing prepared ingredient must be accepted as a source ingredient');assert.deepEqual(Array.from(preparedFromPrepared.draft.items,row=>[row.name,row.quantity]),[['Syrup me',10],['Đá',0.01]]);assert.match(preparedFromPrepared.content,/Nước mía/);
const incompletePrepared=assistant.assistantReply('Tạo nguyên liệu pha chế: Syrup mới');
assert.equal(incompletePrepared.localOnly,true);assert.match(incompletePrepared.content,/chưa thấy phần nguyên liệu nguồn/i);

assert.match(source,/z-index:1001/,'chat drawer must stay above data tables on mobile');
assert.match(source,/height:min\(460px,calc\(100dvh - 72px\)\)/,'mobile chat drawer must have a bounded height');
assert.ok(!loader.includes('chatMultiItemNormalizer:{')&&!loader.includes('chatUnitNormalizer:{'),'only the local assistant may own the send interaction');
assert.ok(!appVersion.includes('loadUnitNormalizer'),'the app version module must not inject a second chatbot command handler');
console.log('Assistant training commands for prices, discounts, stocktake, recipes, and prepared ingredients: PASS');
