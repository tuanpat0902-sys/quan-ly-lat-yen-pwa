import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../ly-unit-conversions.js',import.meta.url),'utf8');
const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const chatbot=await fs.readFile(new URL('../ly-local-chatbot.js',import.meta.url),'utf8');
const stockSync=await fs.readFile(new URL('../ly-stock-unit-sync.js',import.meta.url),'utf8');
const memory=new Map();
const document={readyState:'loading',addEventListener:()=>{}};
const context={window:{},document,localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)},Date};
context.window.window=context.window;
context.window.localStorage=context.localStorage;
context.window.document=document;
vm.createContext(context);
vm.runInContext(source,context);
const units=context.window.__lyUnitConversions;

assert.equal(units.convert(1,'kg','g'),1000);
assert.equal(units.convert(2500,'ml','l'),2.5);
assert.equal(units.convert(2,'l','cl'),200);
assert.equal(units.canonical('kilogram'),'kg');
assert.equal(units.canonical('lít'),'l');
assert.ok(Number.isNaN(units.convert(1,'thùng','chai','ing-1')));
units.saveIngredientRule('ing-1',{baseUnit:'chai',purchaseUnit:'thùng',ratio:24});
assert.equal(units.convert(2,'thùng','chai','ing-1'),48);
assert.equal(units.convert(48,'chai','thùng','ing-1'),2);
assert.equal(units.ruleFor('ing-1').ratio,24);
assert.match(units.optionsHtml('g'),/>mg — miligam</);
assert.match(units.optionsHtml('g'),/>thùng</);
assert.match(units.ingredientOptionsHtml({id:'ing-1',unit:'chai'},'thùng'),/value="thùng" selected/);
assert.match(html,/id="igPurchaseUnit"/,'ingredient form must expose the purchase or packaging unit');
assert.match(html,/id="igConversionRatio"/,'ingredient form must expose the conversion ratio');
assert.match(source,/convert\(1,purchase,base\)/,'standard metric ratios must be calculated automatically');
assert.match(html,/const total=enteredQuantity\*enteredUnitCost/,'import total must remain based on the entered purchase unit');
assert.match(html,/unit_cost:Number\.isFinite\(quantity\)&&quantity>0\?total\/quantity:0/,'import unit cost must be normalized to the inventory base unit');
assert.match(html,/entered_quantity:enteredQuantity[\s\S]*entered_unit:enteredUnit[\s\S]*conversion_ratio:conversionRatio/,'import writes must retain the entered quantity and conversion snapshot');
assert.match(html,/class="irConvertedQty ingredient-unit-cell"/,'the import form must visibly show the converted inventory quantity');
assert.match(html,/function importQuantityBreakdown\(/,'receipt history and editing must share one conversion reconstruction rule');
assert.match(stockSync,/if\(enteredUnit\)return original\.call\(this,ingredientId,supplierName,qty,unitCost,enteredUnit\)/,'editing an import must not convert an already reconstructed display quantity twice');
assert.match(html,/unit-conversion-invalid/,'invalid packaging conversions must block receipt confirmation');
assert.match(chatbot,/window\.__lyUnitConversions\?\.convert/,'chat stock commands must reuse the shared conversion rules');
assert.match(chatbot,/tan\|tấn\|kg/,'chat stock commands must recognize expanded common units');

let syncBoot=null;
const importCalls=[];
units.saveIngredientRule('coconut',{baseUnit:'ml',purchaseUnit:'lon',ratio:400});
const syncDocument={readyState:'loading',addEventListener:(name,callback)=>{if(name==='DOMContentLoaded')syncBoot=callback;},getElementById:()=>null,documentElement:{}};
const syncWindow={
  __lyUnitConversions:units,
  addImportReceiptLine:(...args)=>{importCalls.push(args);},
  addEventListener:()=>{},
};
const syncContext={window:syncWindow,document:syncDocument,db:{ingredients:[{id:'coconut',unit:'ml',purchase_unit:'lon',conversion_ratio:400}]},Option:class{},MutationObserver:class{observe(){}},setTimeout,clearTimeout,console,Intl};
syncWindow.window=syncWindow;
vm.createContext(syncContext);
vm.runInContext(stockSync,syncContext);
syncBoot();
syncWindow.addImportReceiptLine('coconut','',27,30000,'lon');
assert.deepEqual(importCalls.at(-1),['coconut','',27,30000,'lon'],'27 entered cans must stay 27 cans when editing');
syncWindow.addImportReceiptLine('coconut','',10800,75);
assert.deepEqual(importCalls.at(-1),['coconut','',27,30000],'legacy base quantity must still be converted once');
console.log('Measurement units and ingredient conversion rules: PASS');
