import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../ly-chat-unit-normalizer.js',import.meta.url),'utf8');
const window={
  db:{
    ingredients:[
      {id:'sugar',name:'Đường cát',unit:'g',active:true},
      {id:'milk',name:'Sữa tươi',unit:'ml',active:true},
      {id:'filter',name:'Bộ lọc',unit:'bộ',active:true},
      {id:'lemon',name:'Chanh',unit:'quả',active:true}
    ],
    products:[
      {id:'brown',name:'Yên Nâu',unit:'ly',active:true},
      {id:'water',name:'Nước suối',unit:'chai',active:true}
    ]
  }
};
const document={readyState:'loading',addEventListener(){},getElementById(){return null;}};
const context={window,document,db:window.db,setTimeout,console,alert(){}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context);
const normalizer=window.__lyChatUnitNormalizer;
assert.ok(normalizer,'unit normalizer should boot');

const cases=[
  ['tạo phiếu xuất 1kg đường cát','1000 g đường cát'],
  ['nhập kho 0,5 kg đường cát','500 g đường cát'],
  ['nhập một ký đường cát','1000 g đường cát'],
  ['nhập nửa kg đường cát','500 g đường cát'],
  ['kiểm kê đường cát 2kg','2000 g đường cát'],
  ['bán 10 cốc yên nâu','10 ly yên nâu'],
  ['nhập 2 l sữa tươi','2000 ml sữa tươi'],
  ['bán 3 chai nước suối','3 chai nước suối']
];
for(const [input,expected] of cases){
  const result=normalizer.normalizeCommand(input);
  assert.equal(result.issues.length,0,input);
  assert.ok(result.message.toLocaleLowerCase('vi').includes(expected),`${input} -> ${result.message}`);
}

for(const input of ['xuất 1 l đường cát','bán 2 chai yên nâu','bán 2 ly nước suối']){
  const result=normalizer.normalizeCommand(input);
  assert.ok(result.issues.length>0,`${input} must be blocked instead of guessed`);
}

console.log('chat unit normalizer regression tests passed');
