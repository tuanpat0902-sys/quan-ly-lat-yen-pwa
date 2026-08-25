import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../ly-local-chatbot.js',import.meta.url),'utf8');
const document={readyState:'loading',addEventListener(){},getElementById(){return null;},querySelector(){return null;}};
const context={console,Date,Math,Promise,Intl,document,window:{currentWarehouseId:'w1',db:{warehouses:[{id:'w1',name:'Kho chính'}],ingredients:[{id:'i1',warehouse_id:'w1',name:'Đá',unit:'kg',ingredient_type:'purchased'},{id:'i2',warehouse_id:'w1',name:'Đường',unit:'g',ingredient_type:'purchased'},{id:'i3',warehouse_id:'w1',name:'Sữa',unit:'ml',ingredient_type:'purchased'},{id:'i4',warehouse_id:'w1',name:'Trà',unit:'ml',ingredient_type:'purchased'}],products:[{id:'p1',warehouse_id:'w1',name:'Yến nâu',unit:'ly'}]}},globalThis:null,setTimeout};
context.globalThis=context;context.window.window=context.window;context.window.document=document;
vm.createContext(context);vm.runInContext(source,context);const assistant=context.window.__lyLocalAssistant;

const imported=assistant.parseDraft('Nhập 10kg đá với đơn giá nhập là 10 nghìn');
assert.equal(imported.kind,'import');assert.equal(imported.items[0].unit_cost,10000,'must understand import unit price expressed in thousands');
const importTotal=assistant.parseDraft('Nhập 10kg đá, thành tiền nhập 100.000');
assert.equal(importTotal.items[0].unit_cost,10000,'must derive unit cost from total import amount and quantity');

const sale=assistant.parseDraft('Bán 10 ly yến nâu, có giảm giá tổng hóa đơn 10%');
assert.equal(sale.receipt_discount.type,'percent');assert.equal(sale.receipt_discount.value,10,'must preserve receipt-level percent discount');
const itemSale=assistant.parseDraft('Bán 2 ly yến nâu, giảm giá từng món 5 nghìn');
assert.equal(itemSale.items[0].discount.type,'amount');assert.equal(itemSale.items[0].discount.value,5000,'must preserve per-item amount discount');

const stocktake=assistant.assistantReply('Tạo phiếu kiểm kê kho').draft;
assert.ok(stocktake?.open_blank,'a generic stocktake request must open the real stocktake form instead of being searched as an ingredient');assert.equal(assistant.draftReady(stocktake),true);

const recipe=assistant.parseDraft('Tạo công thức tên món là Yên Lát bao gồm 10g Đường, 10ml Sữa, 10ml Trà');
assert.equal(recipe.kind,'recipe');assert.equal(recipe.name,'Yên Lát');assert.deepEqual(Array.from(recipe.items,row=>[row.name,row.quantity]),[['Đường',10],['Sữa',10],['Trà',10]]);
const prepared=assistant.parseDraft('Tạo nguyên liệu pha chế tên là Syrup đường bao gồm 100g Đường');
assert.equal(prepared.kind,'prepared');assert.equal(prepared.name,'Syrup đường');assert.equal(prepared.items[0].id,'i2');

assert.match(source,/z-index:1001/,'chat drawer must stay above data tables on mobile');
assert.match(source,/height:min\(460px,calc\(100dvh - 72px\)\)/,'mobile chat drawer must have a bounded height');
console.log('Assistant training commands for prices, discounts, stocktake, recipes, and prepared ingredients: PASS');
