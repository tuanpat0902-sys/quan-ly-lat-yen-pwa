import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile('ly-chat-language-plus.js','utf8');
const sandbox={
  console,
  Event:class Event{constructor(type,init={}){this.type=type;this.bubbles=Boolean(init.bubbles);}},
  setInterval:()=>0,
  clearInterval:()=>{},
  setTimeout:()=>0,
  document:{addEventListener:()=>{},getElementById:()=>null},
  window:{addEventListener:()=>{},__lyLocalAssistant:null}
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'ly-chat-language-plus.js'});
const normalize=sandbox.window.__lyChatLanguagePlus?.normalizeMessage;
if(typeof normalize!=='function')throw new Error('normalizeMessage is not exposed');

const cases=[
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
for(const [input,expected] of cases){
  const actual=normalize(input);
  if(actual!==expected)throw new Error(`normalizeMessage failed: ${JSON.stringify(input)} => ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}
console.log(`Vietnamese chatbot normalization: PASS (${cases.length} cases)`);
