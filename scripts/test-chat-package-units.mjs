import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const ingredients=[{id:'cocoa',name:'Bột cacao',unit:'g',purchase_unit:'hộp',conversion_ratio:500},{id:'milk',name:'Sữa tươi',unit:'ml',purchase_unit:'chai',conversion_ratio:1000}];
const document={readyState:'loading',addEventListener(){}};
const window={db:{ingredients,warehouses:[],products:[]}};
const context=vm.createContext({window,db:window.db,document,console,Intl,Date,Math,setTimeout});
for(const file of ['ly-chat-unit-sync.js','ly-local-chatbot.js'])vm.runInContext(await fs.readFile(new URL(`../${file}`,import.meta.url),'utf8'),context);
for(const [command,quantity,unit,cost] of [
  ['Nhập 1 hộp Bột cacao đơn giá 100 nghìn',1,'hop',100000],
  ['Nhập 1 hộp (500g) Bột cacao đơn giá 100 nghìn',1,'hop',100000],
  ['Nhập Bột cacao 2 hộp đơn giá 100 nghìn',2,'hop',100000],
  ['Nhập 10 chai Sữa tươi đơn giá 30 nghìn',10,'chai',30000],
  ['Xuất 10 chai (10000ml) Sữa tươi đơn giá 30 nghìn',10,'chai',30000]
]){
  const rewritten=window.__lyChatUnitSync.rewrite(command);
  const draft=window.__lyLocalAssistant.assistantReply(rewritten).draft;
  assert.ok(draft,command);
  assert.equal(draft.items[0].quantity,quantity,rewritten);
  assert.equal(draft.items[0].unit,unit,rewritten);
  assert.equal(draft.items[0].unit_cost,cost,rewritten);
}
console.log('Package quantities and prices survive the complete chat rewrite/parser pipeline.');
