(()=>{
'use strict';
const VERSION='2026.08.24.4';
if(window.__lyLocalAssistant?.version===VERSION)return;
const DB_NAME='lat_yen_local_assistant_v1',STORE='messages';
const state={messages:[],open:false,memory:[],ready:false,voiceConsent:false,voiceRecognition:null};
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
  if(/kiem ke/.test(source))return 'stocktake';
  if(/ban hang|phieu ban|don ban/.test(source))return 'sale';
  if(/xuat kho|phieu xuat/.test(source))return 'export';
  if(/nhap kho|phieu nhap/.test(source))return 'import';
  return '';
}
function actionKind(source){
  if(/\b(xoa|huy)\b/.test(source))return 'delete';
  if(/\b(sua|cap nhat|chinh)\b/.test(source))return 'edit';
  if(/\b(tao|lap|them|moi)\b/.test(source))return 'create';
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
  const source=normalize(message),action=actionKind(source),kind=receiptKind(source);
  if(!action||!kind)return null;
  const draft={id:uid(),action,kind,status:'pending',created_at:now(),warehouse_id:text(window.currentWarehouseId),warehouse_name:text(legacyDb().warehouses?.find(row=>String(row.id)===String(window.currentWarehouseId))?.name),items:[],ambiguities:[]};
  if(action==='create'){const extracted=extractItems(message,kind);draft.items=extracted.items;draft.ambiguities=extracted.ambiguities;draft.receipt_code=receiptCode(message);const dateToken=normalize(message).match(/\b(?:\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/)?.[0],date=parseReportDate(dateToken);if(date)draft.receipt_date=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
  else draft.receipt_code=receiptCode(message);
  return draft;
}
function draftReady(draft){return !(draft?.ambiguities||[]).some(row=>!row.selected_id);}
function chooseDraftItem(draft,ambiguityId,optionId){
  const ambiguity=draft?.ambiguities?.find(row=>String(row.id)===String(ambiguityId)),option=ambiguity?.options?.find(row=>String(row.id)===String(optionId));if(!ambiguity||!option)return false;
  draft.items=(draft.items||[]).filter(item=>String(item.ambiguity_id)!==String(ambiguity.id));draft.items.push({id:option.id,name:option.name,unit:text(option.unit||ambiguity.unit),quantity:ambiguity.quantity,ambiguity_id:ambiguity.id});ambiguity.selected_id=option.id;return true;
}
function draftSummary(draft){
  const title=`${actionLabel(draft.action)} phiếu ${kindLabel(draft.kind)}`;
  const warehouse=draft.warehouse_name?` tại ${draft.warehouse_name}`:'';
  if(draft.action!=='create')return `${title}${draft.receipt_code?` · ${draft.receipt_code}`:' · cần bổ sung số phiếu'}${warehouse}.`;
  const lines=draft.items.length?draft.items.map(item=>item.quantity===null?`${item.name} (chưa rõ số lượng)`: `${formatNumber(item.quantity)}${item.unit?` ${item.unit}`:''} × ${item.name}`).join(', '):'chưa có mặt hàng; form sẽ mở trống';
  const header=[draft.receipt_code&&`số ${draft.receipt_code}`,draft.receipt_date&&`ngày ${displayDate(parseReportDate(draft.receipt_date))}`].filter(Boolean).join(' · ');
  return `${title}${warehouse}${header?` · ${header}`:''}: ${lines}.`;
}
function reportState(){
  const legacy=legacyDb(),core=window.__lyFreshCoreV2?.store?.getState?.()||{};
  return {warehouses:core.warehouses||legacy.warehouses||[],ingredients:core.ingredients||legacy.ingredients||[],products:core.products||legacy.products||[],inventory:core.inventoryData?.balances||legacy.inventory||[],sales:core.salesData?.sales||legacy.sales||[],saleItems:core.salesData?.items||legacy.saleItems||[],imports:core.importsData?.receipts||window.__lyFreshHeaders?.imports||[],exports:core.exportsData?.receipts||window.__lyFreshHeaders?.exports||[],cashflow:core.cashflowEntries||window.__lyFreshCashflow||legacy.cashflows||[]};
}
function parseReportDate(value){const parts=text(value).split(/[\/-]/).map(Number);if(parts.length!==3)return null;const [year,month,day]=parts[0]>999?parts:[parts[2],parts[1],parts[0]],date=new Date(year,month-1,day);return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;}
function displayDate(date){return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);}
function reportPeriod(source){
  const end=new Date(),start=new Date(end);end.setHours(23,59,59,999);
  let label='30 ngày gần nhất';
  const tokens=source.match(/\b(?:\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/g)||[],from=parseReportDate(tokens[0]),to=parseReportDate(tokens[1]);
  if(from&&to){const first=from<=to?from:to,last=from<=to?to:from;start.setTime(first.getTime());end.setTime(last.getTime());start.setHours(0,0,0,0);end.setHours(23,59,59,999);label=`từ ${displayDate(start)} đến ${displayDate(end)}`;}
  else if(from){start.setTime(from.getTime());end.setTime(from.getTime());start.setHours(0,0,0,0);end.setHours(23,59,59,999);label=`ngày ${displayDate(start)}`;}
  else if(/hom nay/.test(source)){start.setHours(0,0,0,0);label='hôm nay';}
  else if(/thang nay/.test(source)){start.setDate(1);start.setHours(0,0,0,0);label='tháng này';}
  else{const matched=source.match(/(\d+)\s*ngay/),days=Math.max(1,Number(matched?.[1]||(/tuan nay/.test(source)?7:30)));start.setHours(0,0,0,0);start.setDate(start.getDate()-days+1);label=matched?`${days} ngày gần nhất`:/tuan nay/.test(source)?'7 ngày gần nhất':label;}
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
    if(!draftReady(draft))return {content:`Mình thấy tên bạn nói có thể khớp với nhiều mặt hàng trong ${draft.warehouse_name||'kho đang chọn'}. Bạn chọn đúng mặt hàng ở bên dưới giúp mình nhé; mình sẽ không tự đoán để tránh tạo sai phiếu.`,draft};
    const missing=draft.items.filter(item=>item.quantity===null);
    if(missing.length)return {content:`Mình nhận ra ${missing.map(item=>item.name).join(', ')}, nhưng chưa thấy số lượng rõ ràng nên mình không tự đoán. Mình đã để trống số lượng để bạn kiểm tra trên form trước khi lưu.`,draft};
    if(!draft.items.length)return {content:`Được nhé. Mình sẽ mở một phiếu ${kindLabel(draft.kind)} trống tại ${draft.warehouse_name||'kho đang chọn'} để bạn điền và kiểm tra trước khi xác nhận.`,draft};
    return {content:`Mình đã đọc được yêu cầu và chuẩn bị bản nháp: ${draftSummary(draft)} Bạn xem lại phần tóm tắt rồi nhấn “Mở bản nháp để kiểm tra” nhé.`,draft};
  }
  const report=reportReply(message);if(report)return report;
  if(/^(xin chao|chao|hello|hi)\b/.test(source))return {content:'Chào bạn 👋 Mình là Trợ lý Lát Yên. Mình có thể chuẩn bị bản nháp phiếu, tra cứu báo cáo theo khoảng ngày và xem nhanh tình hình tồn kho. Bạn muốn làm việc gì trước?'};
  if(/\b(cam on|thank|thanks)\b/.test(source))return {content:'Rất vui vì đã hỗ trợ được bạn 😊 Nếu cần, bạn cứ nói tự nhiên như “Tạo phiếu nhập 10 kg Đường” hoặc “Báo cáo doanh thu từ 01/08/2026 đến 18/08/2026”.'};
  if(/\b(giup|huong dan|lam duoc gi|co the lam gi)\b/.test(source))return {content:'Mình có thể giúp bạn chuẩn bị phiếu nhập, xuất, kiểm kê, bán hàng; tìm phiếu để sửa hoặc xóa; và trả lời báo cáo doanh thu, tồn kho, nhập–xuất, thu–chi theo ngày bạn chọn. Mọi thay đổi đều phải được bạn kiểm tra và xác nhận trên form chính thức.'};
  if(/\b(khoe khong|the nao)\b/.test(source))return {content:'Mình ổn và đang sẵn sàng hỗ trợ bạn đây 😊 Bạn có thể hỏi báo cáo, kiểm tra tồn kho hoặc nhờ mình chuẩn bị một bản nháp phiếu.'};
  return {content:'Mình chưa hiểu trọn ý bạn vừa nói. Bạn có thể nói rõ nghiệp vụ hoặc khoảng thời gian hơn một chút nhé — chẳng hạn “Tạo phiếu xuất 5 kg Đường”, “Sửa phiếu bán BH-001” hoặc “Báo cáo thu chi từ 01/08/2026 đến 15/08/2026”.'};
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
  const choices=(draft?.ambiguities||[]).map(ambiguity=>`<div class="ly-assistant-choice"><b>“${esc(ambiguity.query)}”${ambiguity.quantity!==null?` · ${esc(formatNumber(ambiguity.quantity))}${ambiguity.unit?` ${esc(ambiguity.unit)}`:''}`:''}</b><div>${ambiguity.options.map(option=>`<button type="button" class="${String(ambiguity.selected_id)===String(option.id)?'is-selected':''}" data-draft-choice="${esc(draft.id)}" data-ambiguity-id="${esc(ambiguity.id)}" data-option-id="${esc(option.id)}">${String(ambiguity.selected_id)===String(option.id)?'✓ ':''}${esc(option.name)}${option.unit?` · ${esc(option.unit)}`:''}</button>`).join('')}</div></div>`).join('');
  const retry=draft&&['pending','opened'].includes(draft.status)&&draftReady(draft);
  const action=retry?`<div class="ly-assistant-draft"><b>${esc(draftSummary(draft))}</b><button type="button" data-confirm-draft="${esc(draft.id)}">${draft.action==='delete'?'Tiếp tục đến xác nhận xóa':draft.status==='opened'?'Mở lại bản nháp':'Mở bản nháp để kiểm tra'}</button></div>`:'';
  return `<div class="ly-assistant-message ${message.role==='user'?'is-user':'is-assistant'}"><div>${esc(message.content)}</div>${choices}${action}</div>`;
}
function renderMessages(){
  const holder=document.getElementById?.('lyAssistantMessages');if(!holder)return;
  holder.innerHTML=state.messages.map(messageHtml).join('')||'<div class="ly-assistant-empty">Hỏi trợ lý để tạo bản nháp phiếu. Dữ liệu chat chỉ nằm trên thiết bị này.</div>';
  holder.scrollTop=holder.scrollHeight;
}
async function addMessage(message){state.messages.push(message);await writeMessage(message);renderMessages();return message;}
async function retireDrafts(exceptId=''){
  const retired=[];for(const message of state.messages){if(!message.draft||String(message.draft.id)===String(exceptId))continue;message.draft=null;message.draft_retired_at=now();retired.push(writeMessage(message));}if(retired.length){await Promise.all(retired);renderMessages();}return retired.length;
}
async function submit(){
  const input=document.getElementById?.('lyAssistantInput'),content=text(input?.value);if(!content)return;
  input.value='';await retireDrafts();await addMessage({id:uid(),role:'user',content,created_at:now()});
  const reply=assistantReply(content);await addMessage({id:uid(),role:'assistant',content:reply.content,draft:reply.draft||null,created_at:now()});
}
async function startVoice(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){await addMessage({id:uid(),role:'assistant',content:'Trình duyệt này chưa hỗ trợ nhập lệnh bằng giọng nói. Bạn vẫn có thể nhập lệnh bằng bàn phím.',created_at:now()});return false;}
  if(!state.voiceConsent){
    const accepted=confirm('Trình duyệt có thể gửi âm thanh tới dịch vụ nhận dạng giọng nói trực tuyến. Trợ lý Lát Yên không lưu âm thanh; chỉ văn bản nhận dạng được lưu trong lịch sử trên thiết bị. Bạn có muốn tiếp tục?');
    if(!accepted)return false;
    state.voiceConsent=true;
  }
  if(state.voiceRecognition){try{state.voiceRecognition.stop?.();}catch{}return true;}
  const recognition=new Recognition();state.voiceRecognition=recognition;
  recognition.lang='vi-VN';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1;
  const button=document.querySelector?.('[data-assistant-voice]');
  recognition.onstart=()=>{button?.classList?.add('is-listening');button?.setAttribute?.('aria-label','Đang nghe, nhấn để dừng');};
  recognition.onend=()=>{button?.classList?.remove('is-listening');button?.setAttribute?.('aria-label','Ra lệnh bằng giọng nói');if(state.voiceRecognition===recognition)state.voiceRecognition=null;};
  recognition.onerror=async event=>{await addMessage({id:uid(),role:'assistant',content:event?.error==='not-allowed'?'Chưa được cấp quyền micro. Hãy cho phép micro trong trình duyệt rồi thử lại.':'Không nhận được giọng nói. Vui lòng thử lại hoặc nhập lệnh bằng bàn phím.',created_at:now()});};
  recognition.onresult=event=>{const transcript=text(event?.results?.[0]?.[0]?.transcript),input=document.getElementById?.('lyAssistantInput');if(!transcript||!input)return;input.value=transcript;input.dispatchEvent?.(new Event('input',{bubbles:true}));input.focus?.();input.setSelectionRange?.(transcript.length,transcript.length);};
  recognition.start();return true;
}
function toggle(force){state.open=force===undefined?!state.open:Boolean(force);document.getElementById?.('lyAssistantDrawer')?.classList.toggle('is-open',state.open);}
function installUi(){
  if(document.getElementById?.('lyAssistantLauncher'))return;
  const style=document.createElement('style');style.id='lyAssistantStyles';style.textContent=`
.ly-assistant-launcher{position:fixed;right:18px;bottom:18px;z-index:95;border:0;border-radius:999px;background:#0f766e;color:#fff;padding:12px 16px;font-weight:800;box-shadow:0 12px 32px rgba(15,118,110,.28)}
.ly-assistant-drawer{position:fixed;right:14px;bottom:72px;z-index:96;width:min(410px,calc(100vw - 28px));height:min(620px,calc(100vh - 100px));display:none;grid-template-rows:auto auto 1fr auto;background:#fff;border:1px solid #dbe5e4;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.24);overflow:hidden}.ly-assistant-drawer.is-open{display:grid}
.ly-assistant-head{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:1px solid #e5e7eb}.ly-assistant-head h3{margin:0}.ly-assistant-head button{border:0;background:transparent;font-size:22px}.ly-assistant-privacy{padding:9px 14px;background:#ecfdf5;color:#065f46;font-size:12px}.ly-assistant-messages{padding:12px;overflow:auto;display:flex;flex-direction:column;gap:9px}.ly-assistant-message{max-width:88%;padding:10px 11px;border-radius:13px;background:#f1f5f9;line-height:1.4;font-size:13px}.ly-assistant-message.is-user{align-self:flex-end;background:#0f766e;color:#fff}.ly-assistant-draft{display:grid;gap:8px;margin-top:9px;padding:9px;background:#fff;border:1px solid #cbd5e1;border-radius:10px;color:#334155}.ly-assistant-draft button{border:0;border-radius:8px;background:#0f766e;color:#fff;padding:8px;font-weight:700}.ly-assistant-done{display:block;margin-top:6px;color:#047857}.ly-assistant-empty{margin:auto;color:#64748b;text-align:center;padding:18px}.ly-assistant-compose{display:grid;grid-template-columns:1fr auto auto;gap:8px;padding:11px;border-top:1px solid #e5e7eb}.ly-assistant-compose textarea{resize:none;min-height:44px;max-height:100px;border:1px solid #cbd5e1;border-radius:10px;padding:9px}.ly-assistant-compose button{border:0;border-radius:10px;background:#0f766e;color:#fff;padding:0 13px;font-weight:800}.ly-assistant-compose [data-assistant-voice]{width:48px;padding:0;background:#e7f4f2;color:#0f766e}.ly-voice-visual{display:flex;align-items:center;justify-content:center;gap:2px}.ly-voice-mic{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.ly-voice-wave{display:flex;align-items:center;gap:2px;height:20px}.ly-voice-wave i{display:block;width:2px;height:6px;border-radius:9px;background:currentColor;animation:ly-assistant-wave 1.15s ease-in-out infinite}.ly-voice-wave i:nth-child(2){animation-delay:.16s}.ly-voice-wave i:nth-child(3){animation-delay:.32s}.ly-assistant-compose [data-assistant-voice].is-listening{background:#dc2626;color:#fff;box-shadow:0 0 0 4px rgba(220,38,38,.16)}.ly-assistant-compose [data-assistant-voice].is-listening .ly-voice-wave i{animation-duration:.55s}@keyframes ly-assistant-wave{0%,100%{height:5px;opacity:.45}50%{height:17px;opacity:1}}.ly-assistant-tools{display:flex;justify-content:flex-end;padding:0 12px 9px}.ly-assistant-tools button{border:0;background:transparent;color:#b42318;font-size:12px}
.ly-assistant-choice{display:grid;gap:7px;margin-top:9px;padding:9px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;color:#713f12}.ly-assistant-choice>div{display:flex;flex-wrap:wrap;gap:6px}.ly-assistant-choice button{border:1px solid #d6d3d1;border-radius:999px;background:#fff;color:#334155;padding:6px 9px;font-weight:700}.ly-assistant-choice button.is-selected{border-color:#0f766e;background:#ecfdf5;color:#065f46}
@media(max-width:520px){.ly-assistant-launcher{right:12px;bottom:12px}.ly-assistant-drawer{inset:10px;width:auto;height:auto;bottom:70px}}
`;document.head.appendChild(style);
  const launcher=document.createElement('button');launcher.id='lyAssistantLauncher';launcher.className='ly-assistant-launcher';launcher.type='button';launcher.textContent='Trợ lý Lát Yên';launcher.setAttribute('aria-controls','lyAssistantDrawer');document.body.appendChild(launcher);
  const drawer=document.createElement('section');drawer.id='lyAssistantDrawer';drawer.className='ly-assistant-drawer';drawer.innerHTML=`<div class="ly-assistant-head"><h3>Trợ lý Lát Yên</h3><button type="button" data-assistant-close aria-label="Đóng">×</button></div><div class="ly-assistant-privacy">🔒 Lịch sử chat và đề xuất chỉ lưu trên thiết bị này. Trợ lý không tự lưu hay xóa phiếu.</div><div id="lyAssistantMessages" class="ly-assistant-messages"></div><div><div class="ly-assistant-tools"><button type="button" data-assistant-clear>Xóa lịch sử trên thiết bị</button></div><div class="ly-assistant-compose"><textarea id="lyAssistantInput" placeholder="Ví dụ: Tạo phiếu nhập 10 kg Đường"></textarea><button type="button" data-assistant-voice title="Ra lệnh bằng giọng nói" aria-label="Ra lệnh bằng giọng nói"><span class="ly-voice-visual" aria-hidden="true"><svg class="ly-voice-mic" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"></path></svg><span class="ly-voice-wave"><i></i><i></i><i></i></span></span></button><button type="button" data-assistant-send>Gửi</button></div></div>`;document.body.appendChild(drawer);
  launcher.addEventListener('click',()=>toggle());drawer.querySelector('[data-assistant-close]').addEventListener('click',()=>toggle(false));drawer.querySelector('[data-assistant-send]').addEventListener('click',submit);drawer.querySelector('[data-assistant-voice]').addEventListener('click',startVoice);drawer.querySelector('[data-assistant-clear]').addEventListener('click',()=>{if(confirm('Xóa toàn bộ lịch sử trợ lý trên thiết bị này?'))clearMessages();});
  drawer.querySelector('#lyAssistantInput').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit();}});
  drawer.addEventListener('click',async event=>{const choice=event.target?.closest?.('[data-draft-choice]');if(choice){const message=state.messages.find(row=>row.draft?.id===choice.dataset.draftChoice);if(!message||!chooseDraftItem(message.draft,choice.dataset.ambiguityId,choice.dataset.optionId))return;message.content=draftReady(message.draft)?`Cảm ơn bạn, mình đã cập nhật đúng mặt hàng đã chọn. ${draftSummary(message.draft)} Bạn kiểm tra lại rồi mở bản nháp nhé.`:'Mình đã ghi nhận lựa chọn này. Bạn chọn tiếp các mặt hàng còn chưa rõ nhé.';await writeMessage(message);renderMessages();return;}const id=event.target?.dataset?.confirmDraft;if(!id)return;const message=state.messages.find(row=>row.draft?.id===id);if(!message)return;try{await executeDraft(message.draft);message.draft=null;message.draft_retired_at=now();await writeMessage(message);renderMessages();toggle(false);}catch(error){await addMessage({id:uid(),role:'assistant',content:error?.message||String(error),created_at:now()});}});
}
async function boot(){installUi();state.messages=await readMessages();state.ready=true;renderMessages();}

window.__lyLocalAssistant={version:VERSION,parseDraft,chooseDraftItem,reportReply,assistantReply,executeDraft,startVoice,clearMessages,status:()=>({version:VERSION,ready:state.ready,messageCount:state.messages.length,storage:'indexeddb-device-only',draftLinks:'retired-on-open-or-next-command',reports:'read-only-current-snapshot',voice:'browser-speech-with-consent-manual-send'})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
