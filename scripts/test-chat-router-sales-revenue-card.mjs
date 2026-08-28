import fs from 'node:fs/promises';
import vm from 'node:vm';

const routerSource=await fs.readFile('ly-chat-router.js','utf8');
const cardSource=await fs.readFile('ly-sales-report-revenue-card.js','utf8');

const timer=()=>0;
const routerSandbox={console,setInterval:timer,clearInterval:()=>{},setTimeout:timer,window:{addEventListener:()=>{},__lyLocalAssistant:null}};
vm.createContext(routerSandbox);
vm.runInContext(routerSource,routerSandbox,{filename:'ly-chat-router.js'});
const router=routerSandbox.window.__lyChatRouter;
if(typeof router?.route!=='function')throw new Error('router.route is not exposed');
routerSandbox.window.__lyChatSalesInsights={insightReply:()=>({content:'insights'})};
routerSandbox.window.__lyChatInventoryQuery={inventoryReply:()=>({content:'inventory'})};
routerSandbox.window.__lyChatSalesQuery={salesReply:()=>({content:'sales'})};
if(router.route('Doanh thu hôm nay so với hôm qua')?.content!=='insights')throw new Error('sales insights must have first priority');
routerSandbox.window.__lyChatSalesInsights.insightReply=()=>null;
if(router.route('Báo cáo tồn kho')?.content!=='inventory')throw new Error('inventory must have second priority');
routerSandbox.window.__lyChatInventoryQuery.inventoryReply=()=>null;
if(router.route('Top 5 món hôm nay')?.content!=='sales')throw new Error('sales query must have third priority');

const cardSandbox={
  console,Intl,setInterval:timer,clearInterval:()=>{},setTimeout:timer,
  document:{getElementById:()=>null},
  window:{addEventListener:()=>{},renderSaleReport:null,db:{sales:[]}}
};
vm.createContext(cardSandbox);
vm.runInContext(cardSource,cardSandbox,{filename:'ly-sales-report-revenue-card.js'});
const card=cardSandbox.window.__lySalesReportRevenueCard;
if(typeof card?.comparisonLine!=='function')throw new Error('comparisonLine is not exposed');
if(typeof card?.sync!=='function')throw new Error('revenue lifecycle sync must be exposed');
if(card.formatDate('2026-08-28')!=='28/08/2026')throw new Error('explicit comparison date formatting failed');
if(card.comparisonLine(150,100,'ngày 28/08/2026')!=='Tăng 50% so với ngày 28/08/2026')throw new Error(`Unexpected increase text: ${card.comparisonLine(150,100,'ngày 28/08/2026')}`);
if(card.comparisonLine(75,100,'ngày 28/08/2026')!=='Giảm 25% so với ngày 28/08/2026')throw new Error(`Unexpected decrease text: ${card.comparisonLine(75,100,'ngày 28/08/2026')}`);
if(card.comparisonLine(100,100,'ngày 28/08/2026')!=='Không đổi 0% so với ngày 28/08/2026')throw new Error('equal revenue comparison failed');
if(card.comparisonLine(100,0,'ngày 28/08/2026')!=='Tăng từ 0 đ so với ngày 28/08/2026')throw new Error('zero baseline revenue must remain visible without a misleading percentage');

let revenueNode=null,prependCount=0;
const revenueGrid={firstElementChild:null,querySelector:()=>revenueNode,prepend(node){revenueNode=node;this.firstElementChild=node;prependCount++;}};
const revenueArea={querySelector:selector=>selector==='.sale-qty-summary'?revenueGrid:null};
cardSandbox.document.createElement=()=>({className:'',dataset:{},innerHTML:''});
cardSandbox.document.getElementById=id=>id==='saleReportArea'?revenueArea:id==='saleReportMode'?{value:'day'}:id==='saleReportDate'?{value:'2026-08-29'}:null;
cardSandbox.window.saleReportRows=(start)=>start==='2026-08-29'?[{total_amount:150}]:start==='2026-08-28'?[{total_amount:100}]:[];
if(!card.inject())throw new Error('first revenue inject failed');
const firstRevenueNode=revenueNode;
if(!card.inject())throw new Error('second revenue inject failed');
if(revenueNode!==firstRevenueNode||prependCount!==1)throw new Error('revenue refresh must upsert the same card without remove/recreate flicker');
if(!revenueNode.innerHTML.includes('Tăng 50% so với ngày 28/08/2026'))throw new Error('rendered revenue card must include the explicit comparison date');

console.log('Local chatbot router: PASS (3 priority cases)');
console.log('Sales revenue comparison card: PASS (explicit date + stable zero baseline)');
