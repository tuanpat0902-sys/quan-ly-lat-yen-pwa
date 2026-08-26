(()=>{
  'use strict';
  const VERSION='2026.08.27.1';
  if(window.__lyChatSalesQuery?.version===VERSION)return;

  const state={lastProductId:'',lastMode:'quantity'};
  const text=value=>String(value??'').trim();
  const fold=value=>text(value).toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9.,:/%\-\s]/g,' ').replace(/\s+/g,' ').trim();
  const number=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;};
  const fmt=value=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(number(value));
  const money=value=>`${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(number(value))} đ`;
  const MUTATION=/^(?:(?:hay|vui long|giup|minh|toi|cho)\s+){0,4}(tao|tap|lap|them|moi|cap nhat|chinh|xoa|huy|nhap|xuat)\b/;
  const ITEM_QUERY=/(ban duoc bao nhieu|da ban bao nhieu|ban bao nhieu|so luong.*ban|doanh thu.*mon|doanh thu cua|tien ban.*mon|mon .* ban duoc|mon .* doanh thu)/;
  const TOP_QUERY=/(top\s*\d*\s*mon|\d+\s*mon\s*ban\s*(?:chay|nhieu)|mon\s*ban\s*chay|mon\s*ban\s*nhieu)/;
  const FOLLOWUP=/(mon do|mon nay|mon vua roi|cai do|no)\b/;
  const TIME_SIGNAL=/(hom nay|hom qua|hom kia|tuan nay|tuan truoc|thang nay|thang truoc|\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4})/;

  function snapshot(){
    const core=window.__lyFreshCoreV2?.store?.getState?.()||{},legacy=window.db||{};
    return {warehouses:core.warehouses||legacy.warehouses||[],products:core.products||legacy.products||[],sales:core.salesData?.sales||legacy.sales||[],saleItems:core.salesData?.items||legacy.saleItems||[]};
  }
  function warehouseContext(data){const id=text(window.currentWarehouseId),name=text(data.warehouses.find(row=>String(row.id)===id)?.name)||'Kho đang chọn';return {id,name};}
  function activeProducts(data){return (data.products||[]).filter(row=>row?.active!==false&&row?.id&&text(row.name));}
  function parseDateToken(value){const parts=text(value).split(/[\/-]/).map(Number);if(parts.length!==3)return null;const [year,month,day]=parts[0]>999?parts:[parts[2],parts[1],parts[0]],date=new Date(year,month-1,day);return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;}
  function displayDate(date){return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);}
  function period(message){
    const source=fold(message),now=new Date(),start=new Date(now),end=new Date(now);start.setHours(0,0,0,0);end.setHours(23,59,59,999);
    const token=source.match(/\b(?:\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/)?.[0],exact=parseDateToken(token);
    if(exact){start.setTime(exact.getTime());end.setTime(exact.getTime());start.setHours(0,0,0,0);end.setHours(23,59,59,999);return {start,end,label:`ngày ${displayDate(start)}`};}
    if(/hom kia/.test(source)){start.setDate(start.getDate()-2);end.setTime(start.getTime());end.setHours(23,59,59,999);return {start,end,label:`hôm kia (${displayDate(start)})`};}
    if(/hom qua/.test(source)){start.setDate(start.getDate()-1);end.setTime(start.getTime());end.setHours(23,59,59,999);return {start,end,label:`hôm qua (${displayDate(start)})`};}
    if(/hom nay/.test(source))return {start,end,label:`hôm nay (${displayDate(start)})`};
    if(/tuan truoc/.test(source)){const day=(start.getDay()+6)%7;start.setDate(start.getDate()-day-7);end.setTime(start.getTime());end.setDate(end.getDate()+6);end.setHours(23,59,59,999);return {start,end,label:`tuần trước (${displayDate(start)}–${displayDate(end)})`};}
    if(/tuan nay/.test(source)){const day=(start.getDay()+6)%7;start.setDate(start.getDate()-day);return {start,end,label:`tuần này (${displayDate(start)}–${displayDate(end)})`};}
    if(/thang truoc/.test(source)){start.setDate(1);start.setMonth(start.getMonth()-1);end.setTime(start.getTime());end.setMonth(end.getMonth()+1);end.setDate(0);end.setHours(23,59,59,999);return {start,end,label:`tháng trước (${displayDate(start)}–${displayDate(end)})`};}
    if(/thang nay/.test(source)){start.setDate(1);return {start,end,label:`tháng này (${displayDate(start)}–${displayDate(end)})`};}
    start.setDate(start.getDate()-29);return {start,end,label:`30 ngày gần nhất (${displayDate(start)}–${displayDate(end)})`};
  }
  function rowDate(row){const value=row?.sold_at||row?.sale_date||row?.date||row?.created_at;const date=value?new Date(value):null;return date&&!Number.isNaN(date.getTime())?date:null;}
  function salesInPeriod(data,p,warehouseId){return (data.sales||[]).filter(row=>{const date=rowDate(row);return (!warehouseId||String(row?.warehouse_id)===warehouseId)&&date&&date>=p.start&&date<=p.end;});}
  function queryTerms(message){return fold(message).replace(/\b(mon|san pham|ban|duoc|da|bao nhieu|so luong|doanh thu|tien|hom nay|hom qua|hom kia|tuan nay|tuan truoc|thang nay|thang truoc|trong|cua|la|thi|sao|roi|vua|do|nay)\b/g,' ').replace(/\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}/g,' ').replace(/\s+/g,' ').trim();}
  function editDistance(left,right){const a=fold(left),b=fold(right),row=Array(b.length+1).fill(0).map((_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return row[b.length];}
  function rankProducts(message,data){
    const source=fold(message),products=activeProducts(data),exact=products.filter(row=>source.includes(fold(row.name))).sort((a,b)=>fold(b.name).length-fold(a.name).length);
    if(exact.length){const longest=fold(exact[0].name).length;return exact.filter(row=>fold(row.name).length===longest).map(row=>({row,score:100}));}
    const query=queryTerms(message),tokens=query.split(' ').filter(Boolean);if(!query)return [];
    return products.map(row=>{const name=fold(row.name),words=name.split(' ');let score=name===query?100:name.includes(query)||query.includes(name)?80:0;if(score<80){score+=tokens.filter(token=>words.includes(token)).length*20;for(const token of tokens)if(token.length>=4&&words.some(word=>editDistance(word,token)<=1))score+=8;}return {row,score};}).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||fold(a.row.name).length-fold(b.row.name).length);
  }
  function itemRevenue(item){
    for(const key of ['net_amount','total_amount','line_total','total']){const value=Number(item?.[key]);if(Number.isFinite(value)&&value>=0)return value;}
    const subtotal=Number(item?.subtotal),discount=number(item?.discount_amount??item?.discount_value);
    if(Number.isFinite(subtotal)&&subtotal>=0)return Math.max(0,subtotal-discount);
    const qty=number(item?.quantity),price=number(item?.unit_price??item?.price);return Math.max(0,qty*price-discount);
  }
  function productStats(product,data,p,warehouseId){
    const sales=salesInPeriod(data,p,warehouseId),saleIds=new Set(sales.map(row=>String(row.id))),items=(data.saleItems||[]).filter(row=>saleIds.has(String(row.sale_id))&&String(row.product_id)===String(product.id));
    return {quantity:items.reduce((sum,row)=>sum+number(row.quantity),0),revenue:items.reduce((sum,row)=>sum+itemRevenue(row),0),lines:items.length,sales:new Set(items.map(row=>String(row.sale_id))).size};
  }
  function resolveProduct(message,data){
    const source=fold(message);
    if(FOLLOWUP.test(source)&&state.lastProductId){const product=activeProducts(data).find(row=>String(row.id)===String(state.lastProductId));if(product)return {product,followup:true};}
    const ranked=rankProducts(message,data);if(!ranked.length)return {product:null,candidates:[]};const top=ranked[0].score,candidates=ranked.filter(row=>row.score===top).slice(0,5);return candidates.length===1?{product:candidates[0].row,candidates}: {product:null,candidates};
  }
  function itemReply(message,data=snapshot()){
    const source=fold(message);if(MUTATION.test(source))return null;
    const followup=FOLLOWUP.test(source)&&TIME_SIGNAL.test(source)&&state.lastProductId;
    if(!ITEM_QUERY.test(source)&&!followup)return null;
    const warehouse=warehouseContext(data),resolved=resolveProduct(message,data);
    if(!resolved.product){
      if(resolved.candidates?.length>1)return {content:`Mình thấy nhiều món gần với tên bạn hỏi tại ${warehouse.name}. Bạn chọn đúng món nhé.`,suggestions:resolved.candidates.map(item=>`${item.row.name} bán được bao nhiêu hôm nay?`),report:true,report_kind:'sales_item_ambiguous'};
      return {content:`Mình chưa xác định được món bạn muốn kiểm tra tại ${warehouse.name}. Bạn gửi rõ tên món, ví dụ “Sữa chua bán được bao nhiêu hôm nay?” nhé.`,report:true,report_kind:'sales_item_unknown'};
    }
    const p=period(message),stats=productStats(resolved.product,data,p,warehouse.id),wantsRevenue=/doanh thu|tien ban/.test(source)||state.lastMode==='revenue'&&followup;
    state.lastProductId=String(resolved.product.id);state.lastMode=wantsRevenue?'revenue':'quantity';
    if(wantsRevenue)return {content:`${resolved.product.name} tại ${warehouse.name} trong ${p.label} bán ${fmt(stats.quantity)} món, doanh thu theo dòng bán hàng là ${money(stats.revenue)} từ ${stats.sales} giao dịch.`,report:true,report_kind:'sales_item_revenue',product_id:resolved.product.id};
    return {content:`${resolved.product.name} tại ${warehouse.name} trong ${p.label} bán được ${fmt(stats.quantity)} món từ ${stats.sales} giao dịch${stats.revenue>0?`, tương ứng ${money(stats.revenue)}`:''}.`,report:true,report_kind:'sales_item_quantity',product_id:resolved.product.id};
  }
  function topReply(message,data=snapshot()){
    const source=fold(message);if(MUTATION.test(source)||!TOP_QUERY.test(source))return null;
    const warehouse=warehouseContext(data),p=period(message),sales=salesInPeriod(data,p,warehouse.id),saleIds=new Set(sales.map(row=>String(row.id))),totals=new Map();
    for(const item of data.saleItems||[]){if(!saleIds.has(String(item.sale_id)))continue;const id=String(item.product_id||'');if(!id)continue;const current=totals.get(id)||{quantity:0,revenue:0};current.quantity+=number(item.quantity);current.revenue+=itemRevenue(item);totals.set(id,current);}
    const limit=Math.min(10,Math.max(1,Number(source.match(/(?:top\s*|^)(\d+)\s*mon/)?.[1]||5))),rows=[...totals].map(([id,stats])=>({product:activeProducts(data).find(row=>String(row.id)===id),...stats})).filter(row=>row.product).sort((a,b)=>b.quantity-a.quantity||b.revenue-a.revenue).slice(0,limit);
    if(!rows.length)return {content:`Mình chưa thấy món nào được bán tại ${warehouse.name} trong ${p.label}.`,report:true,report_kind:'sales_top'};
    const lines=rows.map((row,index)=>`${index+1}. ${row.product.name}: ${fmt(row.quantity)} món${row.revenue>0?` · ${money(row.revenue)}`:''}`);state.lastProductId=String(rows[0].product.id);state.lastMode='quantity';
    return {content:`Top ${rows.length} món bán chạy tại ${warehouse.name} trong ${p.label}: ${lines.join('; ')}.`,report:true,report_kind:'sales_top'};
  }
  function salesReply(message,data=snapshot()){return topReply(message,data)||itemReply(message,data);}
  function patchAssistant(){
    const assistant=window.__lyLocalAssistant;if(!assistant||assistant.__lySalesQueryPatched)return false;
    const original=typeof assistant.assistantReply==='function'?assistant.assistantReply.bind(assistant):null;if(!original)return false;
    assistant.assistantReply=(message,...rest)=>salesReply(message)||original(message,...rest);
    const originalStatus=typeof assistant.status==='function'?assistant.status.bind(assistant):()=>({});assistant.status=()=>({...originalStatus(),salesItemQueries:VERSION});assistant.__lySalesQueryPatched=true;return true;
  }
  function sync(){patchAssistant();}
  window.addEventListener?.('latyen:hydrated',sync);window.addEventListener?.('latyen:v2-hydrated',sync);sync();
  const timer=setInterval(()=>{if(patchAssistant())clearInterval(timer);},250);setTimeout(()=>clearInterval(timer),30000);
  window.__lyChatSalesQuery={version:VERSION,itemRevenue,rankProducts,productStats,itemReply,topReply,salesReply,sync,status:()=>({version:VERSION,enabled:true,lastProductId:state.lastProductId,lastMode:state.lastMode})};
})();