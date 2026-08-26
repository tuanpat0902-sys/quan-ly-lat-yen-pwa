import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile('ly-chat-sales-query.js','utf8');
const now=new Date();
const isoAt=(offset,hour=12)=>{const d=new Date(now);d.setDate(d.getDate()+offset);d.setHours(hour,0,0,0);return d.toISOString();};
const sandbox={
  console,Intl,
  setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,
  window:{
    addEventListener:()=>{},currentWarehouseId:'w1',__lyLocalAssistant:null,
    db:{
      warehouses:[{id:'w1',name:'Kho Chính'}],
      products:[
        {id:'p1',name:'Sữa chua',active:true},
        {id:'p2',name:'Ô Long Nhài Cốm',active:true},
        {id:'p3',name:'Cà phê sữa',active:true}
      ],
      sales:[
        {id:'s1',warehouse_id:'w1',sold_at:isoAt(0)},
        {id:'s2',warehouse_id:'w1',sold_at:isoAt(0)},
        {id:'s3',warehouse_id:'w1',sold_at:isoAt(-1)},
        {id:'s4',warehouse_id:'w2',sold_at:isoAt(0)}
      ],
      saleItems:[
        {sale_id:'s1',product_id:'p1',quantity:2,unit_price:30000,discount_amount:5000},
        {sale_id:'s2',product_id:'p1',quantity:1,total_amount:30000},
        {sale_id:'s2',product_id:'p2',quantity:4,line_total:120000},
        {sale_id:'s3',product_id:'p1',quantity:5,subtotal:150000,discount_amount:10000},
        {sale_id:'s3',product_id:'p3',quantity:2,unit_price:25000},
        {sale_id:'s4',product_id:'p1',quantity:99,total_amount:999999}
      ]
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'ly-chat-sales-query.js'});
const sales=sandbox.window.__lyChatSalesQuery;
if(typeof sales?.salesReply!=='function')throw new Error('salesReply is not exposed');

const expectContains=(input,parts)=>{
  const reply=sales.salesReply(input);
  if(!reply?.content)throw new Error(`No sales reply for ${JSON.stringify(input)}`);
  for(const part of parts)if(!reply.content.includes(part))throw new Error(`Sales reply for ${JSON.stringify(input)} missing ${JSON.stringify(part)}: ${reply.content}`);
  return reply;
};

expectContains('Sữa chua bán được bao nhiêu hôm nay?',['Sữa chua','3 món','85.000 đ']);
expectContains('Doanh thu món Sữa chua hôm nay',['Sữa chua','85.000 đ','2 giao dịch']);
expectContains('Sữa chua bán được bao nhiêu hôm qua?',['Sữa chua','5 món','140.000 đ']);
expectContains('món đó hôm nay thì sao?',['Sữa chua','3 món']);
const top=expectContains('Top 2 món hôm nay',['Top 2 món','Ô Long Nhài Cốm','Sữa chua']);
if(top.report_kind!=='sales_top')throw new Error(`Expected sales_top, got ${JSON.stringify(top)}`);
const mutation=sales.salesReply('Tạo phiếu bán 2 Sữa chua');
if(mutation!==null)throw new Error(`Mutation must bypass sales query: ${JSON.stringify(mutation)}`);
if(sales.itemRevenue({quantity:2,unit_price:30000,discount_amount:5000})!==55000)throw new Error('itemRevenue fallback failed');

console.log('Sales item chatbot queries: PASS (7 cases)');