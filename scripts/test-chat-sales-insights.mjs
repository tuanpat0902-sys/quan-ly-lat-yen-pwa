import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile('ly-chat-sales-insights.js','utf8');
const now=new Date();
const isoAt=(offset,hour=12)=>{const d=new Date(now);d.setDate(d.getDate()+offset);d.setHours(hour,0,0,0);return d.toISOString();};
const sandbox={
  console,Intl,
  setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,
  window:{
    addEventListener:()=>{},currentWarehouseId:'w1',__lyLocalAssistant:null,
    db:{
      warehouses:[{id:'w1',name:'Kho Chính'}],
      products:[{id:'p1',name:'Sữa chua',active:true},{id:'p2',name:'Ô Long Nhài Cốm',active:true}],
      sales:[
        {id:'t1',warehouse_id:'w1',sold_at:isoAt(0,10),total_amount:100000},
        {id:'t2',warehouse_id:'w1',sold_at:isoAt(0,15),total_amount:200000},
        {id:'y1',warehouse_id:'w1',sold_at:isoAt(-1,10),total_amount:80000},
        {id:'y2',warehouse_id:'w1',sold_at:isoAt(-1,15),total_amount:120000},
        {id:'other',warehouse_id:'w2',sold_at:isoAt(0,12),total_amount:999999}
      ],
      saleItems:[
        {sale_id:'t1',product_id:'p1',quantity:2},{sale_id:'t2',product_id:'p2',quantity:4},
        {sale_id:'y1',product_id:'p1',quantity:5},{sale_id:'y2',product_id:'p2',quantity:1},
        {sale_id:'other',product_id:'p1',quantity:99}
      ]
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'ly-chat-sales-insights.js'});
const insights=sandbox.window.__lyChatSalesInsights;
if(typeof insights?.insightReply!=='function')throw new Error('insightReply is not exposed');

const expectContains=(input,parts)=>{
  const reply=insights.insightReply(input);
  if(!reply?.content)throw new Error(`No insight reply for ${JSON.stringify(input)}`);
  for(const part of parts)if(!reply.content.includes(part))throw new Error(`Insight reply for ${JSON.stringify(input)} missing ${JSON.stringify(part)}: ${reply.content}`);
  return reply;
};
expectContains('Doanh thu hôm nay so với hôm qua',['300.000 đ','200.000 đ','tăng 100.000 đ','50%']);
expectContains('Trung bình mỗi hóa đơn hôm nay',['150.000 đ','2 hóa đơn','300.000 đ']);
expectContains('Món nào giảm mạnh nhất hôm nay so với hôm qua',['Sữa chua','5 món','2 món','giảm 3 món','60%']);
const mutation=insights.insightReply('Tạo phiếu bán 2 Sữa chua');
if(mutation!==null)throw new Error(`Mutation must bypass insights: ${JSON.stringify(mutation)}`);
const trend=insights.trendText(0,0);if(trend!=='không đổi')throw new Error(`Zero trend failed: ${trend}`);
console.log('Sales insights chatbot: PASS (5 cases)');
