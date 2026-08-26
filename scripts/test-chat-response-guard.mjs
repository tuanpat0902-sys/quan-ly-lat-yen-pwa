import fs from 'node:fs/promises';
import vm from 'node:vm';

const unitSource=await fs.readFile('ly-chat-legacy-inventory-unit-guard.js','utf8');
const gateSource=await fs.readFile('ly-chat-response-gate.js','utf8');

const legacyIngredients=[
  {id:'i1',name:'Bột hạt dẻ cười',unit:'g. g0 g g0 g g0'},
  {id:'i2',name:'Bột cacao',unit:'g. g0 g g0'},
  {id:'i3',name:'Đường',unit:'kg'}
];
const coreIngredients=[
  {id:'i1',name:'Bột hạt dẻ cười',unit:'g'},
  {id:'i2',name:'Bột cacao',unit:'g'},
  {id:'i3',name:'Đường',unit:'kg'}
];
const unitSandbox={
  console,
  document:{readyState:'complete',addEventListener:()=>{}},
  window:{
    db:{ingredients:legacyIngredients},
    __lyFreshCoreV2:{store:{getState:()=>({ingredients:coreIngredients})}},
    addEventListener:()=>{}
  }
};
vm.createContext(unitSandbox);
vm.runInContext(unitSource,unitSandbox,{filename:'ly-chat-legacy-inventory-unit-guard.js'});
const guard=unitSandbox.window.__lyChatLegacyInventoryUnitGuard;
if(typeof guard?.sync!=='function')throw new Error('legacy inventory unit guard is not exposed');
const result=guard.sync();
if(legacyIngredients[0].unit!=='g'||legacyIngredients[1].unit!=='g')throw new Error(`Malformed legacy units were not restored: ${JSON.stringify(legacyIngredients)}`);
if(legacyIngredients[2].unit!=='kg')throw new Error('Valid legacy unit changed unexpectedly');
if(result.checked!==3)throw new Error(`Unexpected guard checked count: ${JSON.stringify(result)}`);

class FakeStore{
  constructor(name){this.name=name;this.values=[];}
  put(value){this.values.push(value);return {value};}
}
const gateSandbox={
  console,
  IDBObjectStore:FakeStore,
  window:{
    addEventListener:()=>{},
    __lyChatRouter:{route:message=>message==='Báo cáo tồn kho'?{content:'Tồn kho sạch',suggestions:['Đường còn bao nhiêu?']}:null}
  }
};
gateSandbox.globalThis=gateSandbox;
vm.createContext(gateSandbox);
vm.runInContext(gateSource,gateSandbox,{filename:'ly-chat-response-gate.js'});
const gate=gateSandbox.window.__lyChatResponseGate;
if(typeof gate?.apply!=='function')throw new Error('chat response gate is not exposed');
const store=new gateSandbox.IDBObjectStore('messages');
store.put({role:'user',content:'Báo cáo tồn kho'});
const assistant={role:'assistant',content:'formatter cũ g. g0 g0',draft:null};
store.put(assistant);
if(assistant.content!=='Tồn kho sạch')throw new Error(`Deterministic reply did not replace lexical fallback: ${assistant.content}`);
if(assistant.suggestions?.[0]!=='Đường còn bao nhiêu?')throw new Error('Deterministic suggestions were not preserved');
const draft={role:'assistant',content:'Bản nháp',draft:{id:'d1'}};store.put(draft);
if(draft.content!=='Bản nháp')throw new Error('Draft reply must not be overridden');

console.log('Legacy chatbot inventory unit guard: PASS');
console.log('Chatbot storage-boundary response gate: PASS');
