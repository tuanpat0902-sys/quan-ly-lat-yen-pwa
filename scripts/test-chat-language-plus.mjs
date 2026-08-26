import fs from 'node:fs/promises';
import vm from 'node:vm';

const languageSource=await fs.readFile('ly-chat-language-plus.js','utf8');
const inventorySource=await fs.readFile('ly-chat-inventory-query.js','utf8');
const sandbox={
  console,
  Intl,
  Event:class Event{constructor(type,init={}){this.type=type;this.bubbles=Boolean(init.bubbles);}},
  setInterval:()=>0,
  clearInterval:()=>{},
  setTimeout:()=>0,
  document:{addEventListener:()=>{},getElementById:()=>null,querySelector:()=>null},
  window:{
    addEventListener:()=>{},
    __lyLocalAssistant:null,
    currentWarehouseId:'w1',
    db:{
      warehouses:[{id:'w1',name:'Kho Chính'}],
      ingredients:[
        {id:'i1',name:'Đường',unit:'kg',minimum_stock:5,active:true},
        {id:'i2',name:'Sữa tươi',unit:'l',minimum_stock:2,active:true},
        {id:'i3',name:'Sữa chua',unit:'hộp',minimum_stock:3,active:true},
        {id:'i4',name:'Bột cacao',unit:'kg',minimum_stock:1,active:true},
        {id:'i5',name:'Bột hạt dẻ cười',unit:'g. g g0 g0 g0 g0',minimum_stock:0,active:true}
      ],
      inventory:[
        {warehouse_id:'w1',ingredient_id:'i1',quantity:4},
        {warehouse_id:'w1',ingredient_id:'i2',quantity:0},
        {warehouse_id:'w1',ingredient_id:'i3',quantity:4},
        {warehouse_id:'w1',ingredient_id:'i5',quantity:5}
      ]
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(languageSource,sandbox,{filename:'ly-chat-language-plus.js'});
const normalize=sandbox.window.__lyChatLanguagePlus?.normalizeMessage;
if(typeof normalize!=='function')throw new Error('normalizeMessage is not exposed');

const languageCases=[
  ['Doanh số tuần rồi','doanh thu tuần trước'],
  ['Top món bữa nay','món bán chạy hôm nay'],
  ['Tiền vào tiền ra tháng rồi','thu chi tháng trước'],
  ['Lương NV năm ngoái','lương nhân viên năm trước'],
  ['doang thu hom qia','doanh thu hôm qua'],
  ['Tồn khp tuần trc','tồn kho tuần trước'],
  ['profit quý rồi','lợi nhuận quý trước'],
  ['Tạo phiếu nhập 10 kg Đường','Tạo phiếu nhập 10 kg Đường'],
  ['Bán ra 10 ly Cà phê sữa','Bán ra 10 ly Cà phê sữa'],
  ['Nhập 5 kg Đường tuần rồi','Nhập 5 kg Đường tuần rồi'],
  ['Cà phê còn hàng không?','Cà phê còn hàng không?'],
  ['Sắp hết hàng tuần này','Sắp hết hàng tuần này'],
  ['Cảm ơn bạn','Cảm ơn bạn']
];
for(const [input,expected] of languageCases){
  const actual=normalize(input);
  if(actual!==expected)throw new Error(`normalizeMessage failed: ${JSON.stringify(input)} => ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

vm.runInContext(inventorySource,sandbox,{filename:'ly-chat-inventory-query.js'});
const inventory=sandbox.window.__lyChatInventoryQuery;
if(typeof inventory?.inventoryReply!=='function')throw new Error('inventoryReply is not exposed');

const expectContains=(input,parts)=>{
  const reply=inventory.inventoryReply(input);
  if(!reply?.content)throw new Error(`No inventory reply for ${JSON.stringify(input)}`);
  for(const part of parts)if(!reply.content.includes(part))throw new Error(`Inventory reply for ${JSON.stringify(input)} missing ${JSON.stringify(part)}: ${reply.content}`);
  return reply;
};
expectContains('Đường còn bao nhiêu?',['Đường','4 kg','cần nhập']);
expectContains('Sữa tươi hết chưa?',['Sữa tươi','0 l','hết hàng']);
expectContains('Bột cacao còn bao nhiêu?',['Bột cacao','chưa thấy số dư tồn kho']);
const ambiguous=inventory.inventoryReply('Sữa còn bao nhiêu?');
if(ambiguous?.report_kind!=='inventory_item_ambiguous'||ambiguous.suggestions?.length!==2)throw new Error(`Expected ambiguous milk query, got ${JSON.stringify(ambiguous)}`);
expectContains('Nguyên liệu nào sắp hết?',['3 nguyên liệu cần chú ý','Đường','Sữa tươi','Sữa chua']);
const summary=expectContains('Báo cáo tồn kho',['3 nguyên liệu còn hàng','1 nguyên liệu đã hết','Bột hạt dẻ cười: 5']);
if(/g0|g\. g/.test(summary.content))throw new Error(`Malformed unit leaked into inventory summary: ${summary.content}`);
if(inventory.safeUnit('g. g g0 g0')!=='')throw new Error('safeUnit must reject malformed units');
const mutation=inventory.inventoryReply('Tạo phiếu nhập 10 kg Đường');
if(mutation!==null)throw new Error(`Mutation must bypass inventory query: ${JSON.stringify(mutation)}`);

console.log(`Vietnamese chatbot normalization: PASS (${languageCases.length} cases)`);
console.log('Inventory chatbot queries: PASS (8 cases)');
