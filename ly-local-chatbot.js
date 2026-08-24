(()=>{
'use strict';
const VERSION='2026.08.25.2';
if(window.__lyLocalAssistant?.version===VERSION)return;
const DB_NAME='lat_yen_local_assistant_v1',STORE='messages';
const state={messages:[],open:false,memory:[],ready:false,thinking:false,lastAiError:''};
const text=value=>String(value??'').trim();
const esc=value=>text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize=value=>text(value).toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9.,:/\-\s]/g,' ').replace(/\s+/g,' ').trim();
const uid=()=>globalThis.crypto?.randomUUID?.()||`local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const now=()=>new Date().toISOString();

function openDatabase(){
  if(!globalThis.indexedDB)return Promise.resolve(null);
  return new Promise(resolve=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>resolve(null);
  });
}
async function readMessages(){
  const db=await openDatabase();
  if(!db)return [...state.memory];
  return new Promise(resolve=>{
    const request=db.transaction(STORE,'readonly').objectStore(STORE).getAll();
    request.onsuccess=()=>resolve((request.result||[]).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))));
    request.onerror=()=>resolve([]);
  });
}
async function writeMessage(message){
  const db=await openDatabase();
  if(!db){state.memory.push(message);return message;}
  return new Promise(resolve=>{
    const request=db.transaction(STORE,'readwrite').objectStore(STORE).put(message);
    request.onsuccess=()=>resolve(message);request.onerror=()=>resolve(message);
  });
}
async function clearMessages(){
  state.memory=[];
  const db=await openDatabase();
  if(db)await new Promise(resolve=>{const request=db.transaction(STORE,'readwrite').objectStore(STORE).clear();request.onsuccess=request.onerror=()=>resolve();});
  state.messages=[];renderMessages();
}

function legacyDb(){try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db||{};}}
function collectionFor(kind){
  const warehouseId=text(window.currentWarehouseId),rows=kind==='sale'?(legacyDb().products||[]):(legacyDb().ingredients||[]);
  return rows.filter(item=>item?.active!==false&&(!warehouseId||!item?.warehouse_id||String(item.warehouse_id)===warehouseId)&&(kind==='sale'||(item.ingredient_type||'purchased')==='purchased'));
}
function parsedQuantity(value){const token=normalize(value),words={khong:0,mot:1,hai:2,ba:3,bon:4,tu:4,nam:5,sau:6,bay:7,tam:8,chin:9,muoi:10};if(token in words)return words[token];const number=Number(token.replace(',','.'));return Number.isFinite(number)?number:null;}
function firstQuantity(message){
  const match=normalize(message).match(/(?:^|\s)(\d+(?:[.,]\d+)?|khong|mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi)\s*(kg|ky|kilogram|g|gram|ml|l|lit|chai|goi|hop|cai|phan|ly|dia)?(?:\s|$)/);
  return match?{quantity:parsedQuantity(match[1]),unit:text(match[2])}:{quantity:null,unit:''};
}
function quantityNear(message,itemName){
  const source=normalize(message),name=normalize(itemName),at=source.indexOf(name);if(at<0)return {quantity:null,unit:''};
  const before=source.slice(Math.max(0,at-42),at),after=source.slice(at+name.length,at+name.length+34),number='(\\d+(?:[.,]\\d+)?|khong|mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi)',unit='(kg|ky|kilogram|g|gram|ml|l|lit|chai|goi|hop|cai|phan|ly|dia)?';
  const left=before.match(new RegExp(`${number}\\s*${unit}\\s*$`)),right=after.match(new RegExp(`^\\s*(?:x|:)?\\s*${number}\\s*${unit}`)),match=left||right;
  return match?{quantity:parsedQuantity(match[1]),unit:text(match[2])}:{quantity:null,unit:''};
}
function containsPhrase(source,phrase){const escaped=phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');return new RegExp(`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`).test(source);}
function extractItems(message,kind){
  const source=normalize(message),catalog=collectionFor(kind).filter(item=>item?.id&&normalize(item.name).length>1),exact=catalog
    .filter(item=>containsPhrase(source,normalize(item.name)))
    .sort((a,b)=>normalize(b.name).length-normalize(a.name).length)
    .filter((item,index,rows)=>!rows.slice(0,index).some(parent=>normalize(parent.name).includes(normalize(item.name))))
    ,items=exact.map(item=>{const amount=quantityNear(message,item.name),quantity=amount.quantity;return {id:item.id,name:item.name,unit:text(item.unit||amount.unit),quantity:kind==='stocktake'?quantity:(quantity!==null&&quantity>0?quantity:null)};}),groups=new Map();
  for(const item of catalog){
    if(exact.some(row=>String(row.id)===String(item.id)))continue;
    const words=normalize(item.name).split(' ');let phrase='';
    for(let length=words.length-1;length>=1;length--){const candidate=words.slice(0,length).join(' ');if(containsPhrase(source,candidate)&&!exact.some(row=>normalize(row.name).includes(candidate))){phrase=candidate;break;}}
    if(!phrase)continue;const rows=groups.get(phrase)||[];rows.push(item);groups.set(phrase,rows);
  }
  const ambiguities=[];
  for(const [phrase,candidates] of groups){
    const amount=quantityNear(message,phrase),unique=[...new Map(candidates.map(item=>[String(item.id),item])).values()];
    if(unique.length>1)ambiguities.push({id:uid(),query:phrase,quantity:kind==='stocktake'?amount.quantity:(amount.quantity!==null&&amount.quantity>0?amount.quantity:null),unit:text(amount.unit),selected_id:'',options:unique.map(item=>({id:item.id,name:item.name,unit:text(item.unit||amount.unit)}))});
    else if(unique.length===1){const item=unique[0],quantity=kind==='stocktake'?amount.quantity:(amount.quantity!==null&&amount.quantity>0?amount.quantity:null);items.push({id:item.id,name:item.name,unit:text(item.unit||amount.unit),quantity});}
  }
  return {items,ambiguities};
}
function receiptKind(source){
  if(/kiem ke|kiem kho|phieu kiem/.test(source))return 'stocktake';
  if(/ban hang|phieu ban|don ban|hoa don ban|\bban\b/.test(source))return 'sale';
  if(/xuat kho|phieu xuat|xuat hang|phieu suat|\bxuat\b/.test(source))return 'export';
  if(/nhap kho|phieu nhap|nhap hang|\bnhap\b/.test(source))return 'import';
  return '';
}
function actionKind(source){
  const lead=source.match(/^(?:(?:hay|vui long|giup|minh|toi|cho)\s+){0,4}(xoa|huy|sua|cap nhat|chinh|tao|lap|them|moi)\b/)?.[1]||'';
  if(['xoa','huy'].includes(lead))return 'delete';
  if(['sua','cap nhat','chinh'].includes(lead))return 'edit';
  if(['tao','lap','them','moi'].includes(lead))return 'create';
  return '';
}
function receiptCode(message){
  const raw=text(message);
  const explicit=raw.match(/(?:số|so|mã|ma)\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9._/-]{2,})/i)?.[1];
  if(explicit)return text(explicit);
  return text(raw.match(/\b([A-Za-z]{1,10}[-_/]\d[A-Za-z0-9._/-]*)\b/i)?.[1]||'');
}
function kindLabel(kind){return ({import:'nhập kho',export:'xuất kho',stocktake:'kiểm kê',sale:'bán hàng'})[kind]||'phiếu';}
function actionLabel(action){return ({create:'Tạo',edit:'Sửa',delete:'Xóa'})[action]||'Xử lý';}
function parseDraft(message){
  const source=normalize(message),kind=receiptKind(source),explicitAction=actionKind(source),action=explicitAction||(kind&&/^\s*(nhap|xuat|ban|kiem ke|kiem kho)\b/.test(source)?'create':'');
  if(!action||!kind)return null;
  const draft={id:uid(),action,kind,status:'pending',created_at:now(),warehouse_id:text(window.currentWarehouseId),warehouse_name:text(legacyDb().warehouses?.find(row=>String(row.id)===String(window.currentWarehouseId))?.name),items:[],clarifications:[]};
  if(action==='create'){const extracted=extractItems(message,kind);draft.items=extracted.items;draft.clarifications=extracted.ambiguities.map(row=>({...row,type:'item',resolved:false}));draft.receipt_code=receiptCode(message);const dateToken=normalize(message).match(/\b(?:\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/)?.[0],date=parseReportDate(dateToken)||naturalSingleDate(source);if(date)draft.receipt_date=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
  else draft.receipt_code=receiptCode(message);
  return draft;
}
function draftReady(draft){
  if(!draft)return false;
  if(draft.action!=='create')return true;
  return draft.items?.length>0&&!(draft.clarifications||[]).some(row=>!row.resolved)&&draft.items.every(item=>item.quantity!==null&&Number.isFinite(Number(item.quantity))&&(draft.kind==='stocktake'?Number(item.quantity)>=0:Number(item.quantity)>0));
}
function addQuantityClarification(draft,item){
  if(item.quantity!==null||(draft.clarifications||[]).some(row=>row.type==='quantity'&&!row.resolved&&String(row.item_id)===String(item.id)))return;
  draft.clarifications.push({id:uid(),type:'quantity',query:item.name,item_id:item.id,item_name:item.name,unit:item.unit,options:[1,5,10].map(value=>({id:String(value),value,label:`${formatNumber(value)}${item.unit?` ${item.unit}`:''}`})),resolved:false});
}
function answerDraftClarification(draft,clarificationId,optionId){
  const clarification=draft?.clarifications?.find(row=>String(row.id)===String(clarificationId)&&!row.resolved),option=clarification?.options?.find(row=>String(row.id)===String(optionId));if(!clarification||!option)return false;
  if(clarification.type==='item'){
    const item={id:option.id,name:option.name,unit:text(option.unit||clarification.unit),quantity:clarification.quantity,clarification_id:clarification.id};
    draft.items=(draft.items||[]).filter(row=>String(row.clarification_id)!==String(clarification.id));draft.items.push(item);clarification.selected_id=option.id;clarification.resolved=true;addQuantityClarification(draft,item);
  }else{
    const item=draft.items?.find(row=>String(row.id)===String(clarification.item_id));if(!item)return false;item.quantity=Number(option.value);clarification.selected_id=option.id;clarification.resolved=true;
  }
  return true;
}
function chooseDraftItem(draft,clarificationId,optionId){
  return answerDraftClarification(draft,clarificationId,optionId);
}
function requestedTerm(message){
  return normalize(message)
    .replace(/\b(tao|lap|them|moi|sua|cap nhat|chinh|xoa|huy)\b/g,' ')
    .replace(/\b(phieu|don|hoa don|nhap kho|nhap hang|nhap|xuat kho|xuat hang|xuat|ban hang|ban|kiem ke|kiem kho|kiem)\b/g,' ')
    .replace(/\b\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}\b/g,' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(kg|ky|kilogram|g|gram|ml|l|lit|chai|goi|hop|cai|phan|ly|dia)?\b/g,' ')
    .replace(/\b(giup|minh|toi|cho|voi|nhe|a|so|ma)\b/g,' ').replace(/\s+/g,' ').trim();
}
function displayRequestedTerm(message,normalizedTerm){
  const tokens=new Set(normalizedTerm.split(' ').filter(Boolean)),rawWords=text(message).split(/\s+/),matched=rawWords.filter(word=>{const token=normalize(word);return token&&tokens.has(token);}).join(' ').replace(/[.,;:!?]+$/,'');
  const known=[...(legacyDb().ingredients||[]),...(legacyDb().products||[])].find(item=>normalize(item.name)===normalizedTerm);
  return known?.name||matched||normalizedTerm;
}
function suggestionCandidates(message,draft){
  const legacy=legacyDb(),term=requestedTerm(message),source=normalize(message),catalog=collectionFor(draft.kind),tokens=term.split(' ').filter(token=>token.length>1);
  let candidates=[];
  if(draft.kind==='sale'){
    const ingredientIds=new Set((legacy.ingredients||[]).filter(item=>containsPhrase(source,normalize(item.name))||tokens.some(token=>normalize(item.name).includes(token))).map(item=>String(item.id)));
    const relatedIds=new Set((legacy.recipeItems||[]).filter(row=>ingredientIds.has(String(row.ingredient_id))).map(row=>String(row.product_id)));
    candidates=catalog.filter(item=>relatedIds.has(String(item.id)));
  }
  if(!candidates.length)candidates=catalog.map(item=>({item,score:tokens.reduce((score,token)=>score+(normalize(item.name).includes(token)?3:normalize(item.name).split(' ').some(word=>word.startsWith(token)||token.startsWith(word))?1:0),0)})).sort((a,b)=>b.score-a.score||normalize(a.item.name).localeCompare(normalize(b.item.name))).map(row=>row.item);
  return [...new Map(candidates.map(item=>[String(item.id),item])).values()].slice(0,4);
}
function clarificationReply(message,draft){
  if(draft.action!=='create')return null;
  if(draft.clarifications.some(row=>row.type==='item'&&!row.resolved))return {content:`Mình thấy tên bạn nói có thể khớp với nhiều mặt hàng trong ${draft.warehouse_name||'kho đang chọn'}. Bạn chọn đúng mặt hàng ở bên dưới giúp mình nhé; lựa chọn sẽ được cập nhật ngay vào bản nháp.`,draft};
  if(!draft.items.length){
    const term=requestedTerm(message),displayTerm=displayRequestedTerm(message,term),candidates=suggestionCandidates(message,draft),noun=draft.kind==='sale'?'món':'nguyên liệu',amount=firstQuantity(message);
    if(!candidates.length)return {content:term?`Mình chưa tìm thấy ${noun} “${displayTerm}” trong ${draft.warehouse_name||'kho đang chọn'}. Bạn có thể nói rõ tên ${noun} hơn được không ạ?`:`Bạn muốn ${kindLabel(draft.kind)} ${noun} nào ạ? Bạn nói thêm tên và số lượng giúp mình nhé.`,localOnly:true};
    draft.clarifications.push({id:uid(),type:'item',query:displayTerm||noun,quantity:draft.kind==='stocktake'?amount.quantity:(amount.quantity!==null&&amount.quantity>0?amount.quantity:null),unit:amount.unit,options:candidates.map(item=>({id:item.id,name:item.name,unit:text(item.unit||amount.unit)})),resolved:false});
    return {content:term?`Mình chưa tìm thấy chính xác ${noun} “${displayTerm}” trong ${draft.warehouse_name||'kho đang chọn'}. Bạn chọn một gợi ý bên dưới nhé; mình sẽ cập nhật ngay vào bản nháp, không cần gửi lại câu lệnh.`:`Bạn muốn ${kindLabel(draft.kind)} ${noun} nào ạ? Hãy chọn một gợi ý bên dưới; mình sẽ cập nhật ngay vào bản nháp.`,draft};
  }
  const missing=draft.items.filter(item=>item.quantity===null);
  if(missing.length){
    missing.forEach(item=>addQuantityClarification(draft,item));
    return {content:`Mình đã nhận ra ${missing.map(row=>row.name).join(', ')}, nhưng chưa rõ số lượng. Bạn chọn số lượng cho từng mặt hàng bên dưới nhé; mỗi lựa chọn sẽ được áp dụng ngay.`,draft};
  }
  return null;
}
function draftSummary(draft){
  const title=`${actionLabel(draft.action)} phiếu ${kindLabel(draft.kind)}`;
  const warehouse=draft.warehouse_name?` tại ${draft.warehouse_name}`:'';
  if(draft.action!=='create')return `${title}${draft.receipt_code?` · ${draft.receipt_code}`:' · cần bổ sung số phiếu'}${warehouse}.`;
  const lines=draft.items.length?draft.items.map(item=>item.quantity===null?`${item.name} (chưa rõ số lượng)`: `${formatNumber(item.quantity)}${item.unit?` ${item.unit}`:''} × ${item.name}`).join(', '):'chưa có mặt hàng';
  const header=[draft.receipt_code&&`số ${draft.receipt_code}`,draft.receipt_date&&`ngày ${displayDate(parseReportDate(draft.receipt_date))}`].filter(Boolean).join(' · ');
  return `${title}${warehouse}${header?` · ${header}`:''}: ${lines}.`;
}
function reportState(){
  const legacy=legacyDb(),core=window.__lyFreshCoreV2?.store?.getState?.()||{};
  return {warehouses:core.warehouses||legacy.warehouses||[],ingredients:core.ingredients||legacy.ingredients||[],products:core.products||legacy.products||[],inventory:core.inventoryData?.balances||legacy.inventory||[],sales:core.salesData?.sales||legacy.sales||[],saleItems:core.salesData?.items||legacy.saleItems||[],imports:core.importsData?.receipts||window.__lyFreshHeaders?.imports||[],exports:core.exportsData?.receipts||window.__lyFreshHeaders?.exports||[],cashflow:core.cashflowEntries||window.__lyFreshCashflow||legacy.cashflows||[]};
}
function parseReportDate(value){const parts=text(value).split(/[\/-]/).map(Number);if(parts.length!==3)return null;const [year,month,day]=parts[0]>999?parts:[parts[2],parts[1],parts[0]],date=new Date(year,month-1,day);return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;}
function displayDate(date){return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);}
function naturalSingleDate(source,base=new Date()){
  const value=normalize(source),date=new Date(base);date.setHours(0,0,0,0);
  if(/\b(hom kia|ngay kia)\b/.test(value))date.setDate(date.getDate()-2);
  else if(/\b(hom qua|ngay hom truoc|hom truoc)\b/.test(value))date.setDate(date.getDate()-1);
  else{const ago=value.match(/\b(\d+)\s*ngay truoc\b/);if(ago)date.setDate(date.getDate()-Math.max(0,Number(ago[1])));else if(!/\b(hom nay|ngay nay)\b/.test(value))return null;}
  return date;
}
function periodResult(start,end,label){start.setHours(0,0,0,0);end.setHours(23,59,59,999);return {start,end,label};}
function reportPeriod(source){
  const end=new Date(),start=new Date(end),value=normalize(source);end.setHours(23,59,59,999);
  let label='30 ngày gần nhất';
  const tokens=value.match(/\b(?:\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/g)||[],from=parseReportDate(tokens[0]),to=parseReportDate(tokens[1]);
  if(from&&to){const first=from<=to?from:to,last=from<=to?to:from;start.setTime(first.getTime());end.setTime(last.getTime());start.setHours(0,0,0,0);end.setHours(23,59,59,999);label=`từ ${displayDate(start)} đến ${displayDate(end)}`;}
  else if(from){start.setTime(from.getTime());end.setTime(from.getTime());start.setHours(0,0,0,0);end.setHours(23,59,59,999);label=`ngày ${displayDate(start)}`;}
  else if(/\b(hom kia|ngay kia)\b/.test(value)){start.setDate(start.getDate()-2);end.setTime(start.getTime());return periodResult(start,end,`hôm kia (${displayDate(start)})`);}
  else if(/\b(hom qua|ngay hom truoc|hom truoc)\b/.test(value)){start.setDate(start.getDate()-1);end.setTime(start.getTime());return periodResult(start,end,`hôm qua (${displayDate(start)})`);}
  else if(/\b(hom nay|ngay nay)\b/.test(value)){return periodResult(start,end,`hôm nay (${displayDate(start)})`);}
  else if(/\btuan truoc\b/.test(value)){const day=(start.getDay()+6)%7;start.setDate(start.getDate()-day-7);end.setTime(start.getTime());end.setDate(end.getDate()+6);return periodResult(start,end,`tuần trước, từ ${displayDate(start)} đến ${displayDate(end)}`);}
  else if(/\btuan nay\b/.test(value)){const day=(start.getDay()+6)%7;start.setDate(start.getDate()-day);return periodResult(start,end,`tuần này, từ ${displayDate(start)} đến ${displayDate(end)}`);}
  else if(/\bthang truoc\b/.test(value)){start.setDate(1);start.setMonth(start.getMonth()-1);end.setTime(start.getTime());end.setMonth(end.getMonth()+1);end.setDate(0);return periodResult(start,end,`tháng trước, từ ${displayDate(start)} đến ${displayDate(end)}`);}
  else if(/\bthang nay\b/.test(value)){start.setDate(1);return periodResult(start,end,`tháng này, từ ${displayDate(start)} đến ${displayDate(end)}`);}
  else if(/\bquy (nay|truoc)\b/.test(value)){const previous=/\bquy truoc\b/.test(value),quarter=Math.floor(start.getMonth()/3)-(previous?1:0);start.setMonth(quarter*3,1);end.setTime(start.getTime());end.setMonth(end.getMonth()+3);end.setDate(0);if(!previous&&end>new Date())end.setTime(new Date().getTime());return periodResult(start,end,`${previous?'quý trước':'quý này'}, từ ${displayDate(start)} đến ${displayDate(end)}`);}
  else if(/\bnam (nay|truoc)\b/.test(value)){const previous=/\bnam truoc\b/.test(value),year=start.getFullYear()-(previous?1:0);start.setFullYear(year,0,1);end.setFullYear(year,11,31);if(!previous)end.setTime(new Date().getTime());return periodResult(start,end,`${previous?'năm trước':'năm nay'}, từ ${displayDate(start)} đến ${displayDate(end)}`);}
  else{const exactAgo=value.match(/\b(\d+)\s*ngay truoc\b/);if(exactAgo){start.setDate(start.getDate()-Number(exactAgo[1]));end.setTime(start.getTime());return periodResult(start,end,`ngày ${displayDate(start)}`);}const matched=value.match(/(\d+)\s*ngay/),days=Math.max(1,Number(matched?.[1]||30));start.setHours(0,0,0,0);start.setDate(start.getDate()-days+1);label=matched?`${days} ngày gần nhất`:label;}
  return {start,end,label};
}
function rowDate(row){const value=row?.sold_at||row?.entry_date||row?.receipt_date||row?.date||row?.created_at;const date=value?new Date(value):null;return date&&!Number.isNaN(date.getTime())?date:null;}
function inReport(row,period,warehouseId){const date=rowDate(row);return (!warehouseId||String(row?.warehouse_id)===warehouseId)&&date&&date>=period.start&&date<=period.end;}
const formatNumber=value=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(Number(value||0));
const formatMoney=value=>`${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(Number(value||0))} đ`;
function reportReply(message){
  const source=normalize(message);
  if(!/(bao cao|thong ke|tong quan|doanh thu|ton kho|thu chi|dong tien|chi phi|nhap xuat|ban duoc|ban hang)/.test(source))return null;
  const data=reportState(),warehouseId=text(window.currentWarehouseId),warehouse=data.warehouses.find(row=>String(row.id)===warehouseId),period=reportPeriod(source),scope=warehouse?.name?`Kho ${warehouse.name}`:'Kho đang chọn';
  const sales=data.sales.filter(row=>inReport(row,period,warehouseId)),saleIds=new Set(sales.map(row=>String(row.id))),saleItems=data.saleItems.filter(row=>saleIds.has(String(row.sale_id))),revenue=sales.reduce((sum,row)=>sum+Number(row.total_amount||0),0),sold=saleItems.reduce((sum,row)=>sum+Number(row.quantity||0),0);
  const topSales=new Map();for(const item of saleItems){const product=data.products.find(row=>String(row.id)===String(item.product_id)),name=product?.name||'Món đã xóa';topSales.set(name,(topSales.get(name)||0)+Number(item.quantity||0));}
  const best=[...topSales].sort((a,b)=>b[1]-a[1])[0];
  const cashflow=data.cashflow.filter(row=>inReport(row,period,warehouseId)),income=cashflow.filter(row=>['income','thu','in'].includes(normalize(row.entry_type??row.type))).reduce((sum,row)=>sum+Number(row.amount||0),0),expense=cashflow.filter(row=>['expense','chi','out'].includes(normalize(row.entry_type??row.type))).reduce((sum,row)=>sum+Number(row.amount||0),0);
  const balances=data.inventory.filter(row=>!warehouseId||String(row.warehouse_id)===warehouseId),positive=balances.filter(row=>Number(row.quantity||0)>0),zero=balances.filter(row=>Number(row.quantity||0)<=0),topStock=positive.map(row=>({name:data.ingredients.find(item=>String(item.id)===String(row.ingredient_id))?.name||'Nguyên liệu đã xóa',quantity:Number(row.quantity||0)})).sort((a,b)=>b.quantity-a.quantity).slice(0,3);
  const imports=data.imports.filter(row=>inReport(row,period,warehouseId)),exports=data.exports.filter(row=>inReport(row,period,warehouseId));
  if(/ton kho|nguyen lieu/.test(source))return {content:balances.length?`Mình đã kiểm tra ${scope}: hiện có ${positive.length} nguyên liệu còn hàng và ${zero.length} nguyên liệu đã hết${topStock.length?`. Tồn nhiều nhất là ${topStock.map(row=>`${row.name} ${formatNumber(row.quantity)}`).join(', ')}`:''}.`:`Mình chưa thấy dữ liệu tồn kho tại ${scope}. Bạn thử đồng bộ lại dữ liệu hoặc kiểm tra đúng kho đang chọn nhé.`,report:true};
  if(/thu chi|dong tien|chi phi/.test(source))return {content:cashflow.length?`Kết quả thu–chi của ${scope} trong ${period.label}: tổng thu ${formatMoney(income)}, tổng chi ${formatMoney(expense)}, chênh lệch ${formatMoney(income-expense)}.`:`Trong ${period.label}, mình chưa thấy khoản thu hoặc chi nào tại ${scope}.`,report:true};
  if(/nhap xuat/.test(source))return {content:imports.length||exports.length?`Mình tìm thấy ${imports.length} phiếu nhập và ${exports.length} phiếu xuất tại ${scope} trong ${period.label}.`:`Mình chưa thấy phiếu nhập hoặc xuất nào tại ${scope} trong ${period.label}.`,report:true};
  if(/doanh thu|ban duoc|ban hang/.test(source))return {content:sales.length?`Trong ${period.label}, ${scope} có ${sales.length} giao dịch, bán ${formatNumber(sold)} món và đạt doanh thu ${formatMoney(revenue)}${best?`. Món bán chạy nhất là ${best[0]} (${formatNumber(best[1])})`:''}.`:`Mình chưa thấy giao dịch bán hàng nào tại ${scope} trong ${period.label}.`,report:true};
  return {content:`Mình đã tổng hợp ${scope} trong ${period.label}: doanh thu ${formatMoney(revenue)} từ ${sales.length} giao dịch; thu ${formatMoney(income)}, chi ${formatMoney(expense)}; ${positive.length} nguyên liệu còn hàng; ${imports.length} phiếu nhập và ${exports.length} phiếu xuất.`,report:true};
}
function assistantReply(message){
  const source=normalize(message),draft=parseDraft(message);
  if(draft){
    if(draft.action!=='create'&&!draft.receipt_code)return {content:`Mình hiểu bạn muốn ${actionLabel(draft.action).toLocaleLowerCase('vi')} phiếu ${kindLabel(draft.kind)}, nhưng chưa thấy số phiếu. Bạn gửi lại giúp mình theo mẫu “${actionLabel(draft.action)} phiếu ${kindLabel(draft.kind)} số PN-001” nhé.`};
    if(draft.action==='delete')return {content:`Mình đã chuẩn bị yêu cầu xóa phiếu ${kindLabel(draft.kind)} ${draft.receipt_code}. Khi bạn nhấn nút bên dưới, phần mềm sẽ tìm đúng phiếu và vẫn hỏi xác nhận lần cuối — chưa xóa ngay đâu nhé.`,draft};
    if(draft.action==='edit')return {content:`Mình đã nhận yêu cầu sửa phiếu ${kindLabel(draft.kind)} ${draft.receipt_code}. Bạn nhấn nút bên dưới để mở đúng phiếu, kiểm tra và chỉnh sửa trên form chính thức nhé.`,draft};
    const clarification=clarificationReply(message,draft);if(clarification)return clarification;
    return {content:`Mình đã đọc được yêu cầu và chuẩn bị bản nháp: ${draftSummary(draft)} Bạn xem lại phần tóm tắt rồi nhấn “Mở bản nháp để kiểm tra” nhé.`,draft};
  }
  const report=reportReply(message);if(report)return report;
  if(/^(xin chao|chao|hello|hi)\b/.test(source))return {content:'Chào bạn 👋 Mình là Trợ lý Lát Yên. Mình có thể chuẩn bị bản nháp phiếu, tra cứu báo cáo theo khoảng ngày và xem nhanh tình hình tồn kho. Bạn muốn làm việc gì trước?'};
  if(/\b(cam on|thank|thanks)\b/.test(source))return {content:'Rất vui vì đã hỗ trợ được bạn 😊 Nếu cần, bạn cứ nói tự nhiên như “Tạo phiếu nhập 10 kg Đường” hoặc “Báo cáo doanh thu từ 01/08/2026 đến 18/08/2026”.'};
  if(/\b(giup|huong dan|lam duoc gi|co the lam gi)\b/.test(source))return {content:'Mình có thể giúp bạn chuẩn bị phiếu nhập, xuất, kiểm kê, bán hàng; tìm phiếu để sửa hoặc xóa; và trả lời báo cáo doanh thu, tồn kho, nhập–xuất, thu–chi theo ngày bạn chọn. Mọi thay đổi đều phải được bạn kiểm tra và xác nhận trên form chính thức.'};
  if(/\b(khoe khong|the nao)\b/.test(source))return {content:'Mình ổn và đang sẵn sàng hỗ trợ bạn đây 😊 Bạn có thể hỏi báo cáo, kiểm tra tồn kho hoặc nhờ mình chuẩn bị một bản nháp phiếu.'};
  return {content:'Mình chưa hiểu trọn ý bạn vừa nói. Bạn có thể nói rõ nghiệp vụ hoặc khoảng thời gian hơn một chút nhé — chẳng hạn “Tạo phiếu xuất 5 kg Đường”, “Sửa phiếu bán BH-001” hoặc “Báo cáo thu chi từ 01/08/2026 đến 15/08/2026”.'};
}

function supabaseClient(){try{return typeof sb!=='undefined'?sb:window.sb||null;}catch(_){return window.sb||null;}}
function aiContext(localReply){
  const data=reportState(),warehouseId=text(window.currentWarehouseId),warehouse=data.warehouses.find(row=>String(row.id)===warehouseId);
  return JSON.stringify({warehouse:warehouse?.name||'Kho đang chọn',available_data:{ingredients:data.ingredients.length,products:data.products.length,inventory_rows:data.inventory.length,sales:data.sales.length,imports:data.imports.length,exports:data.exports.length,cashflow_entries:data.cashflow.length},verified_local_answer:text(localReply).slice(0,3000)});
}
function recentConversation(currentMessage){
  const rows=state.messages.filter(row=>!row.draft&&['user','assistant'].includes(row.role)).slice(-7);
  if(rows.at(-1)?.role==='user'&&text(rows.at(-1)?.content)===text(currentMessage))rows.pop();
  return rows.slice(-6).map(row=>({role:row.role,content:text(row.content).slice(0,700)}));
}
async function askAi(message,localReply){
  const client=supabaseClient();
  if(!client?.functions?.invoke)return localReply;
  try{
    const request=client.functions.invoke('lat-yen-chat',{body:{message:text(message).slice(0,2000),recent_context:recentConversation(message),local_context:aiContext(localReply),warehouse_name:text(legacyDb().warehouses?.find(row=>String(row.id)===String(window.currentWarehouseId))?.name).slice(0,200)}});
    const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('AI_TIMEOUT')),15000));
    const {data,error}=await Promise.race([request,timeout]);
    if(error||!text(data?.answer))throw error||new Error('AI_EMPTY_RESPONSE');
    state.lastAiError='';return text(data.answer);
  }catch(error){state.lastAiError=text(error?.message||error);return localReply;}
}

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(read,attempts=16){for(let i=0;i<attempts;i++){const value=read();if(value)return value;await delay(50);}return null;}
async function navigate(panel){
  const button=document.querySelector?.(`#nav button[data-panel="${panel}"]`);
  if(!button)throw new Error('Không tìm thấy mục nghiệp vụ cần mở.');
  button.click();
  const target=await waitFor(()=>document.getElementById?.(panel));
  if(!target)throw new Error('Màn hình nghiệp vụ chưa sẵn sàng.');
  return target;
}
function setValue(id,value){const element=document.getElementById?.(id);if(element&&value!==undefined)element.value=String(value);}
function signal(element,type){try{element?.dispatchEvent?.(new Event(type,{bubbles:true}));}catch(_){}}
function formContract(kind){return ({
  import:{form:'inlineImportReceiptForm',toggle:'toggleImportReceiptBtn',holder:'importReceiptLines',row:'.import-receipt-line',add:'button[onclick*="addImportReceiptLine"]',select:'.irIngredient',quantity:'.irQty'},
  export:{form:'inlineExportReceiptForm',toggle:'toggleExportReceiptBtn',holder:'exportReceiptLines',row:'.export-receipt-line',add:'button[onclick*="addExportReceiptLine"]',select:'.erIngredient',quantity:'.erQty'},
  stocktake:{form:'inlineStocktakeForm',toggle:'toggleStocktakeBtn',holder:'stocktakeReceiptLines',row:'.stocktake-receipt-line',quantity:'.srActual'},
  sale:{form:'inlineSaleReceiptForm',toggle:'toggleSaleReceiptBtn',holder:'saleReceiptLines',row:'.sale-receipt-line',add:'button[onclick*="addSaleReceiptLine"]',select:'.srProduct',quantity:'.srQty'}
})[kind];}
function fillDraftItems(draft,contract,form){
  if(!draft.items.length)return;
  const holder=document.getElementById?.(contract.holder);if(!holder)return;
  if(draft.kind==='stocktake'){
    for(const item of draft.items){if(item.quantity===null)continue;const row=[...holder.querySelectorAll(contract.row)].find(node=>String(node.dataset?.ingredientId)===String(item.id));const input=row?.querySelector(contract.quantity);if(input){input.value=String(item.quantity);signal(input,'input');}}
    return;
  }
  let rows=[...holder.querySelectorAll(contract.row)];
  while(rows.length>1){rows.pop().remove();}
  const add=form.querySelector(contract.add);
  while(rows.length<draft.items.length&&add){add.click();rows=[...holder.querySelectorAll(contract.row)];}
  draft.items.forEach((item,index)=>{const row=rows[index];if(!row)return;const select=row.querySelector(contract.select),quantity=row.querySelector(contract.quantity);if(select){select.value=String(item.id);signal(select,'change');}if(quantity){quantity.value=item.quantity===null?'':String(item.quantity);signal(quantity,'input');}});
}
async function openCreateDraft(draft){
  const panel=draft.kind==='sale'?'sales':draft.kind==='stocktake'?'stocktake':'imports';await navigate(panel);
  const contract=formContract(draft.kind),form=await waitFor(()=>document.getElementById?.(contract.form));
  if(!form)throw new Error('Không tìm thấy form phiếu trên màn hình nghiệp vụ.');
  if(!form.classList.contains('open')){
    const toggleButton=document.getElementById?.(contract.toggle);if(!toggleButton)throw new Error('Không tìm thấy nút mở form phiếu.');
    toggleButton.click();
  }
  const opened=await waitFor(()=>form.classList.contains('open')&&form);
  if(!opened)throw new Error('Form nghiệp vụ chưa mở được. Vui lòng thử lại.');
  fillDraftItems(draft,contract,form);
  const header=({import:{code:'receiptNo',date:'receiptDate'},export:{code:'exportReceiptNo',date:'exportReceiptDate'},stocktake:{code:'stocktakeReceiptNo',date:'stocktakeReceiptDate'},sale:{code:'saleReceiptNo',date:'saleReceiptDate'}})[draft.kind];
  if(draft.receipt_code)setValue(header.code,draft.receipt_code);if(draft.receipt_date)setValue(header.date,draft.receipt_date);
  if(draft.kind==='import'){
    setValue('receiptNote','Bản nháp từ Trợ lý Lát Yên');
  }else if(draft.kind==='export'){
    setValue('exportReceiptReason','Bản nháp từ Trợ lý Lát Yên');
  }else if(draft.kind==='stocktake'){
    setValue('stocktakeReceiptNote','Bản nháp từ Trợ lý Lát Yên');
  }else{
    setValue('saleReceiptNote','Bản nháp từ Trợ lý Lát Yên');
  }
  form.scrollIntoView?.({behavior:'smooth',block:'start'});
  return form;
}
function receiptButton(draft){
  const panel=draft.kind==='sale'?'sales':draft.kind==='stocktake'?'stocktake':'imports';
  const prefix=draft.action==='edit'?'edit':'delete';
  const suffix=({import:'ImportReceipt',export:'ExportReceipt',stocktake:'StocktakeReceipt',sale:'SaleReceipt'})[draft.kind];
  const candidates=[...(document.getElementById?.(panel)?.querySelectorAll?.(`button[onclick*="${prefix}${suffix}"]`)||[])];
  const code=normalize(draft.receipt_code);
  return candidates.find(button=>{
    let node=button;
    for(let depth=0;node&&depth<7;depth++,node=node.parentElement)if(normalize(node.textContent).includes(code))return true;
    return false;
  })||null;
}
async function executeDraft(draft){
  if(!draft||!['pending','opened'].includes(draft.status))return false;
  if(!draftReady(draft))throw new Error('Bạn cần chọn đúng mặt hàng trong các gợi ý trước khi mở bản nháp.');
  if(draft.action==='create')await openCreateDraft(draft);
  else{
    if(!draft.receipt_code)throw new Error('Cần nhập rõ số phiếu trước khi tiếp tục.');
    const panel=draft.kind==='sale'?'sales':draft.kind==='stocktake'?'stocktake':'imports';await navigate(panel);
    await delay(120);
    const button=receiptButton(draft);if(!button)throw new Error(`Không tìm thấy phiếu ${draft.receipt_code} trong kho đang chọn.`);
    button.click();
    if(draft.action==='edit'){
      const contract=formContract(draft.kind);const form=await waitFor(()=>document.getElementById?.(contract.form)?.classList.contains('open')&&document.getElementById(contract.form));
      if(!form)throw new Error('Đã tìm thấy phiếu nhưng form sửa chưa mở được.');
    }
  }
  draft.status='opened';draft.opened_at=now();await writeMessage(state.messages.find(message=>message.draft?.id===draft.id)||{id:uid(),role:'assistant',content:draftSummary(draft),draft,created_at:now()});
  renderMessages();return true;
}

function messageHtml(message){
  const draft=message.draft;
  const choices=(draft?.clarifications||[]).filter(row=>!row.resolved).map(clarification=>`<div class="ly-assistant-choice"><b>${clarification.type==='quantity'?`Số lượng ${esc(clarification.item_name)}`:`“${esc(clarification.query)}”${clarification.quantity!==null?` · ${esc(formatNumber(clarification.quantity))}${clarification.unit?` ${esc(clarification.unit)}`:''}`:''}`}</b><div>${clarification.options.map(option=>`<button type="button" data-draft-choice="${esc(draft.id)}" data-clarification-id="${esc(clarification.id)}" data-option-id="${esc(option.id)}">${esc(option.label||option.name)}${clarification.type==='item'&&option.unit?` · ${esc(option.unit)}`:''}</button>`).join('')}</div></div>`).join('');
  const retry=draft&&['pending','opened'].includes(draft.status)&&draftReady(draft);
  const action=retry?`<div class="ly-assistant-draft"><b>${esc(draftSummary(draft))}</b><button type="button" data-confirm-draft="${esc(draft.id)}">${draft.action==='delete'?'Tiếp tục đến xác nhận xóa':draft.status==='opened'?'Mở lại bản nháp':'Mở bản nháp để kiểm tra'}</button></div>`:'';
  return `<div class="ly-assistant-message ${message.role==='user'?'is-user':'is-assistant'}"><div>${esc(message.content)}</div>${choices}${action}</div>`;
}
function renderMessages(){
  const holder=document.getElementById?.('lyAssistantMessages');if(!holder)return;
  const typing=state.thinking?'<div class="ly-assistant-message is-assistant ly-assistant-thinking" aria-live="polite">Đang suy nghĩ<span>…</span></div>':'';
  holder.innerHTML=state.messages.map(messageHtml).join('')+typing||'<div class="ly-assistant-empty">Hỏi trợ lý để tạo bản nháp phiếu. Lịch sử chat chỉ nằm trên thiết bị này.</div>';
  holder.scrollTop=holder.scrollHeight;
}
async function addMessage(message){state.messages.push(message);await writeMessage(message);renderMessages();return message;}
async function retireDrafts(exceptId=''){
  const retired=[];for(const message of state.messages){if(String(message.draft?.id)===String(exceptId))continue;if(!message.draft&&!message.suggestions?.length)continue;message.draft=null;message.suggestions=null;message.draft_retired_at=now();retired.push(writeMessage(message));}if(retired.length){await Promise.all(retired);renderMessages();}return retired.length;
}
async function submit(){
  const input=document.getElementById?.('lyAssistantInput'),content=text(input?.value);if(!content)return;
  input.value='';await retireDrafts();await addMessage({id:uid(),role:'user',content,created_at:now()});
  const reply=assistantReply(content);
  if(reply.draft||reply.localOnly){await addMessage({id:uid(),role:'assistant',content:reply.content,draft:reply.draft||null,created_at:now()});return;}
  state.thinking=true;renderMessages();const answer=await askAi(content,reply.content);state.thinking=false;await addMessage({id:uid(),role:'assistant',content:answer,created_at:now()});
}
function toggle(force){state.open=force===undefined?!state.open:Boolean(force);document.getElementById?.('lyAssistantDrawer')?.classList.toggle('is-open',state.open);}
function installUi(){
  if(document.getElementById?.('lyAssistantLauncher'))return;
  const style=document.createElement('style');style.id='lyAssistantStyles';style.textContent=`
.ly-assistant-launcher{position:fixed;right:18px;bottom:18px;z-index:95;border:0;border-radius:999px;background:#0f766e;color:#fff;padding:12px 16px;font-weight:800;box-shadow:0 12px 32px rgba(15,118,110,.28)}
.ly-assistant-drawer{position:fixed;right:14px;bottom:72px;z-index:96;width:min(410px,calc(100vw - 28px));height:min(620px,calc(100vh - 100px));display:none;grid-template-rows:auto auto 1fr auto;background:#fff;border:1px solid #dbe5e4;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.24);overflow:hidden}.ly-assistant-drawer.is-open{display:grid}
.ly-assistant-head{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:1px solid #e5e7eb}.ly-assistant-head h3{margin:0}.ly-assistant-head button{border:0;background:transparent;font-size:22px}.ly-assistant-privacy{padding:9px 14px;background:#ecfdf5;color:#065f46;font-size:12px}.ly-assistant-messages{padding:12px;overflow:auto;display:flex;flex-direction:column;gap:9px}.ly-assistant-message{max-width:88%;padding:10px 11px;border-radius:13px;background:#f1f5f9;line-height:1.4;font-size:13px}.ly-assistant-message.is-user{align-self:flex-end;background:#0f766e;color:#fff}.ly-assistant-draft{display:grid;gap:8px;margin-top:9px;padding:9px;background:#fff;border:1px solid #cbd5e1;border-radius:10px;color:#334155}.ly-assistant-draft button{border:0;border-radius:8px;background:#0f766e;color:#fff;padding:8px;font-weight:700}.ly-assistant-done{display:block;margin-top:6px;color:#047857}.ly-assistant-empty{margin:auto;color:#64748b;text-align:center;padding:18px}.ly-assistant-compose{display:grid;grid-template-columns:1fr auto;gap:8px;padding:11px;border-top:1px solid #e5e7eb}.ly-assistant-compose textarea{resize:none;min-height:44px;max-height:100px;border:1px solid #cbd5e1;border-radius:10px;padding:9px}.ly-assistant-compose button{border:0;border-radius:10px;background:#0f766e;color:#fff;padding:0 14px;font-weight:800}.ly-assistant-send{display:flex;align-items:center;justify-content:center;gap:6px;overflow:hidden}.ly-assistant-send svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;animation:ly-assistant-send 2.4s ease-in-out infinite}@keyframes ly-assistant-send{0%,72%,100%{transform:translate(0,0) rotate(0);opacity:1}82%{transform:translate(4px,-4px) rotate(-5deg);opacity:.65}88%{transform:translate(-3px,3px) rotate(3deg);opacity:.35}}@media(prefers-reduced-motion:reduce){.ly-assistant-send svg{animation:none}}.ly-assistant-tools{display:flex;justify-content:flex-end;padding:0 12px 9px}.ly-assistant-tools button{border:0;background:transparent;color:#b42318;font-size:12px}
.ly-assistant-choice{display:grid;gap:7px;margin-top:9px;padding:9px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;color:#713f12}.ly-assistant-choice>div{display:flex;flex-wrap:wrap;gap:6px}.ly-assistant-choice button{border:1px solid #d6d3d1;border-radius:999px;background:#fff;color:#334155;padding:6px 9px;font-weight:700}.ly-assistant-choice button.is-selected{border-color:#0f766e;background:#ecfdf5;color:#065f46}
.ly-assistant-thinking span{display:inline-block;animation:ly-assistant-thinking 1s ease-in-out infinite}@keyframes ly-assistant-thinking{0%,100%{opacity:.25}50%{opacity:1}}
@media(max-width:520px){.ly-assistant-launcher{right:12px;bottom:12px}.ly-assistant-drawer{inset:10px;width:auto;height:auto;bottom:70px}}
`;document.head.appendChild(style);
  const launcher=document.createElement('button');launcher.id='lyAssistantLauncher';launcher.className='ly-assistant-launcher';launcher.type='button';launcher.textContent='Trợ lý Lát Yên';launcher.setAttribute('aria-controls','lyAssistantDrawer');document.body.appendChild(launcher);
  const drawer=document.createElement('section');drawer.id='lyAssistantDrawer';drawer.className='ly-assistant-drawer';drawer.innerHTML=`<div class="ly-assistant-head"><h3>Trợ lý Lát Yên</h3><button type="button" data-assistant-close aria-label="Đóng">×</button></div><div class="ly-assistant-privacy">🔒 Lịch sử chat chỉ lưu trên thiết bị này. Khi dùng AI, câu hỏi hiện tại, tối đa 6 tin gần nhất và bản tóm tắt dữ liệu tối thiểu được gửi bảo mật để trả lời đúng ngữ cảnh. Trợ lý không tự lưu hay xóa phiếu.</div><div id="lyAssistantMessages" class="ly-assistant-messages"></div><div><div class="ly-assistant-tools"><button type="button" data-assistant-clear>Xóa lịch sử trên thiết bị</button></div><div class="ly-assistant-compose"><textarea id="lyAssistantInput" placeholder="Ví dụ: Tạo phiếu nhập 10 kg Đường"></textarea><button type="button" class="ly-assistant-send" data-assistant-send aria-label="Gửi tin nhắn"><span>Gửi</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M22 2 11 13"></path><path d="m22 2-7 20-4-9-9-4Z"></path></svg></button></div></div>`;document.body.appendChild(drawer);
  launcher.addEventListener('click',()=>toggle());drawer.querySelector('[data-assistant-close]').addEventListener('click',()=>toggle(false));drawer.querySelector('[data-assistant-send]').addEventListener('click',submit);drawer.querySelector('[data-assistant-clear]').addEventListener('click',()=>{if(confirm('Xóa toàn bộ lịch sử trợ lý trên thiết bị này?'))clearMessages();});
  drawer.querySelector('#lyAssistantInput').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit();}});
  drawer.addEventListener('click',async event=>{const choice=event.target?.closest?.('[data-draft-choice]');if(choice){const message=state.messages.find(row=>row.draft?.id===choice.dataset.draftChoice);if(!message||!answerDraftClarification(message.draft,choice.dataset.clarificationId,choice.dataset.optionId))return;message.content=draftReady(message.draft)?`Cảm ơn bạn, mình đã cập nhật lựa chọn trực tiếp vào bản nháp. ${draftSummary(message.draft)} Bạn kiểm tra lại rồi mở bản nháp nhé.`:'Mình đã cập nhật lựa chọn trực tiếp vào bản nháp. Bạn chọn tiếp phần còn chưa rõ bên dưới nhé.';await writeMessage(message);renderMessages();return;}const id=event.target?.dataset?.confirmDraft;if(!id)return;const message=state.messages.find(row=>row.draft?.id===id);if(!message)return;try{await executeDraft(message.draft);message.draft=null;message.draft_retired_at=now();await writeMessage(message);renderMessages();toggle(false);}catch(error){await addMessage({id:uid(),role:'assistant',content:error?.message||String(error),created_at:now()});}});
}
async function boot(){installUi();state.messages=await readMessages();state.ready=true;renderMessages();}

window.__lyLocalAssistant={version:VERSION,parseDraft,draftReady,chooseDraftItem,answerDraftClarification,reportReply,assistantReply,askAi,submit,executeDraft,clearMessages,status:()=>({version:VERSION,ready:state.ready,messageCount:state.messages.length,storage:'indexeddb-device-only',ai:'openai-responses-via-authenticated-edge-function',lastAiError:state.lastAiError,draftLinks:'retired-on-open-or-next-command',reports:'read-only-current-snapshot',voice:'removed'})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
