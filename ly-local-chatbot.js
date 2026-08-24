(()=>{
'use strict';
const VERSION='2026.08.24.3';
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
function collectionFor(kind){return kind==='sale'?(legacyDb().products||[]):(legacyDb().ingredients||[]);}
function quantityNear(message,itemName){
  const source=normalize(message),name=normalize(itemName),at=source.indexOf(name);if(at<0)return 1;
  const before=source.slice(Math.max(0,at-32),at),after=source.slice(at+name.length,at+name.length+24);
  const left=before.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|g|gram|ml|l|lit|chai|goi|hop|cai|phan|ly|dia)?\s*$/);
  const right=after.match(/^\s*(?:x|:)?\s*(\d+(?:[.,]\d+)?)/);
  return Number(String(left?.[1]||right?.[1]||1).replace(',','.'))||1;
}
function extractItems(message,kind){
  const source=normalize(message);
  return collectionFor(kind)
    .filter(item=>item?.id&&normalize(item.name).length>1&&source.includes(normalize(item.name)))
    .sort((a,b)=>normalize(b.name).length-normalize(a.name).length)
    .filter((item,index,rows)=>!rows.slice(0,index).some(parent=>normalize(parent.name).includes(normalize(item.name))))
    .map(item=>({id:item.id,name:item.name,quantity:quantityNear(message,item.name)}));
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
  const draft={id:uid(),action,kind,status:'pending',created_at:now(),warehouse_id:text(window.currentWarehouseId),warehouse_name:text(legacyDb().warehouses?.find(row=>String(row.id)===String(window.currentWarehouseId))?.name),items:[]};
  if(action==='create')draft.items=extractItems(message,kind);
  else draft.receipt_code=receiptCode(message);
  return draft;
}
function draftSummary(draft){
  const title=`${actionLabel(draft.action)} phiếu ${kindLabel(draft.kind)}`;
  const warehouse=draft.warehouse_name?` tại ${draft.warehouse_name}`:'';
  if(draft.action!=='create')return `${title}${draft.receipt_code?` · ${draft.receipt_code}`:' · cần bổ sung số phiếu'}${warehouse}.`;
  const lines=draft.items.length?draft.items.map(item=>`${item.quantity} × ${item.name}`).join(', '):'chưa nhận diện mặt hàng; form sẽ mở trống';
  return `${title}${warehouse}: ${lines}.`;
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
  if(/ton kho|nguyen lieu/.test(source))return {content:`${scope} · Tồn kho hiện tại: ${positive.length} nguyên liệu còn hàng, ${zero.length} nguyên liệu hết hàng${topStock.length?` · Nhiều nhất: ${topStock.map(row=>`${row.name} ${formatNumber(row.quantity)}`).join(', ')}`:''}.`,report:true};
  if(/thu chi|dong tien|chi phi/.test(source))return {content:`${scope} · Báo cáo thu–chi ${period.label}: Thu ${formatMoney(income)} · Chi ${formatMoney(expense)} · Chênh lệch ${formatMoney(income-expense)}.`,report:true};
  if(/nhap xuat/.test(source))return {content:`${scope} · Báo cáo nhập–xuất ${period.label}: ${imports.length} phiếu nhập · ${exports.length} phiếu xuất.`,report:true};
  if(/doanh thu|ban duoc|ban hang/.test(source))return {content:`${scope} · Báo cáo bán hàng ${period.label}: ${sales.length} giao dịch · ${formatNumber(sold)} món · Doanh thu ${formatMoney(revenue)}${best?` · Bán chạy: ${best[0]} (${formatNumber(best[1])})`:''}.`,report:true};
  return {content:`${scope} · Tổng quan ${period.label}: Doanh thu ${formatMoney(revenue)} từ ${sales.length} giao dịch · Thu ${formatMoney(income)} · Chi ${formatMoney(expense)} · ${positive.length} nguyên liệu còn hàng · ${imports.length} phiếu nhập, ${exports.length} phiếu xuất.`,report:true};
}
function assistantReply(message){
  const draft=parseDraft(message);
  if(draft)return {content:`Mình đã tạo đề xuất cục bộ. ${draftSummary(draft)} Hãy kiểm tra rồi xác nhận để mở bản nháp trong form chính thức.`,draft};
  const report=reportReply(message);if(report)return report;
  return {content:'Mình có thể tạo bản nháp hoặc đọc báo cáo. Hãy thử: “Tạo phiếu nhập 10 kg Đường”, “Báo cáo doanh thu hôm nay”, “Tồn kho hiện tại” hoặc “Thu chi tháng này”.'};
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
    for(const item of draft.items){const row=[...holder.querySelectorAll(contract.row)].find(node=>String(node.dataset?.ingredientId)===String(item.id));const input=row?.querySelector(contract.quantity);if(input){input.value=String(item.quantity);signal(input,'input');}}
    return;
  }
  let rows=[...holder.querySelectorAll(contract.row)];
  while(rows.length>1){rows.pop().remove();}
  const add=form.querySelector(contract.add);
  while(rows.length<draft.items.length&&add){add.click();rows=[...holder.querySelectorAll(contract.row)];}
  draft.items.forEach((item,index)=>{const row=rows[index];if(!row)return;const select=row.querySelector(contract.select),quantity=row.querySelector(contract.quantity);if(select){select.value=String(item.id);signal(select,'change');}if(quantity){quantity.value=String(item.quantity);signal(quantity,'input');}});
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
  const retry=draft&&['pending','opened'].includes(draft.status);
  const action=retry?`<div class="ly-assistant-draft"><b>${esc(draftSummary(draft))}</b><button type="button" data-confirm-draft="${esc(draft.id)}">${draft.action==='delete'?'Tiếp tục đến xác nhận xóa':draft.status==='opened'?'Mở lại bản nháp':'Mở bản nháp để kiểm tra'}</button></div>`:'';
  return `<div class="ly-assistant-message ${message.role==='user'?'is-user':'is-assistant'}"><div>${esc(message.content)}</div>${action}</div>`;
}
function renderMessages(){
  const holder=document.getElementById?.('lyAssistantMessages');if(!holder)return;
  holder.innerHTML=state.messages.map(messageHtml).join('')||'<div class="ly-assistant-empty">Hỏi trợ lý để tạo bản nháp phiếu. Dữ liệu chat chỉ nằm trên thiết bị này.</div>';
  holder.scrollTop=holder.scrollHeight;
}
async function addMessage(message){state.messages.push(message);await writeMessage(message);renderMessages();return message;}
async function submit(){
  const input=document.getElementById?.('lyAssistantInput'),content=text(input?.value);if(!content)return;
  input.value='';await addMessage({id:uid(),role:'user',content,created_at:now()});
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
  try{state.voiceRecognition?.abort?.();}catch{}
  const recognition=new Recognition();state.voiceRecognition=recognition;
  recognition.lang='vi-VN';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1;
  const button=document.querySelector?.('[data-assistant-voice]');
  recognition.onstart=()=>{button?.classList?.add('is-listening');button?.setAttribute?.('aria-label','Đang nghe, nhấn để dừng');};
  recognition.onend=()=>{button?.classList?.remove('is-listening');button?.setAttribute?.('aria-label','Ra lệnh bằng giọng nói');if(state.voiceRecognition===recognition)state.voiceRecognition=null;};
  recognition.onerror=async event=>{await addMessage({id:uid(),role:'assistant',content:event?.error==='not-allowed'?'Chưa được cấp quyền micro. Hãy cho phép micro trong trình duyệt rồi thử lại.':'Không nhận được giọng nói. Vui lòng thử lại hoặc nhập lệnh bằng bàn phím.',created_at:now()});};
  recognition.onresult=async event=>{const transcript=text(event?.results?.[0]?.[0]?.transcript);const input=document.getElementById?.('lyAssistantInput');if(!transcript||!input)return;input.value=transcript;await submit();};
  recognition.start();return true;
}
function toggle(force){state.open=force===undefined?!state.open:Boolean(force);document.getElementById?.('lyAssistantDrawer')?.classList.toggle('is-open',state.open);}
function installUi(){
  if(document.getElementById?.('lyAssistantLauncher'))return;
  const style=document.createElement('style');style.id='lyAssistantStyles';style.textContent=`
.ly-assistant-launcher{position:fixed;right:18px;bottom:18px;z-index:95;border:0;border-radius:999px;background:#0f766e;color:#fff;padding:12px 16px;font-weight:800;box-shadow:0 12px 32px rgba(15,118,110,.28)}
.ly-assistant-drawer{position:fixed;right:14px;bottom:72px;z-index:96;width:min(410px,calc(100vw - 28px));height:min(620px,calc(100vh - 100px));display:none;grid-template-rows:auto auto 1fr auto;background:#fff;border:1px solid #dbe5e4;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.24);overflow:hidden}.ly-assistant-drawer.is-open{display:grid}
.ly-assistant-head{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:1px solid #e5e7eb}.ly-assistant-head h3{margin:0}.ly-assistant-head button{border:0;background:transparent;font-size:22px}.ly-assistant-privacy{padding:9px 14px;background:#ecfdf5;color:#065f46;font-size:12px}.ly-assistant-messages{padding:12px;overflow:auto;display:flex;flex-direction:column;gap:9px}.ly-assistant-message{max-width:88%;padding:10px 11px;border-radius:13px;background:#f1f5f9;line-height:1.4;font-size:13px}.ly-assistant-message.is-user{align-self:flex-end;background:#0f766e;color:#fff}.ly-assistant-draft{display:grid;gap:8px;margin-top:9px;padding:9px;background:#fff;border:1px solid #cbd5e1;border-radius:10px;color:#334155}.ly-assistant-draft button{border:0;border-radius:8px;background:#0f766e;color:#fff;padding:8px;font-weight:700}.ly-assistant-done{display:block;margin-top:6px;color:#047857}.ly-assistant-empty{margin:auto;color:#64748b;text-align:center;padding:18px}.ly-assistant-compose{display:grid;grid-template-columns:1fr auto auto;gap:8px;padding:11px;border-top:1px solid #e5e7eb}.ly-assistant-compose textarea{resize:none;min-height:44px;max-height:100px;border:1px solid #cbd5e1;border-radius:10px;padding:9px}.ly-assistant-compose button{border:0;border-radius:10px;background:#0f766e;color:#fff;padding:0 13px;font-weight:800}.ly-assistant-compose [data-assistant-voice]{background:#e2e8f0;color:#0f172a;font-size:18px}.ly-assistant-compose [data-assistant-voice].is-listening{background:#dc2626;color:#fff;animation:ly-assistant-pulse 1s infinite}@keyframes ly-assistant-pulse{50%{opacity:.62}}.ly-assistant-tools{display:flex;justify-content:flex-end;padding:0 12px 9px}.ly-assistant-tools button{border:0;background:transparent;color:#b42318;font-size:12px}
@media(max-width:520px){.ly-assistant-launcher{right:12px;bottom:12px}.ly-assistant-drawer{inset:10px;width:auto;height:auto;bottom:70px}}
`;document.head.appendChild(style);
  const launcher=document.createElement('button');launcher.id='lyAssistantLauncher';launcher.className='ly-assistant-launcher';launcher.type='button';launcher.textContent='Trợ lý Lát Yên';launcher.setAttribute('aria-controls','lyAssistantDrawer');document.body.appendChild(launcher);
  const drawer=document.createElement('section');drawer.id='lyAssistantDrawer';drawer.className='ly-assistant-drawer';drawer.innerHTML=`<div class="ly-assistant-head"><h3>Trợ lý Lát Yên</h3><button type="button" data-assistant-close aria-label="Đóng">×</button></div><div class="ly-assistant-privacy">🔒 Lịch sử chat và đề xuất chỉ lưu trên thiết bị này. Trợ lý không tự lưu hay xóa phiếu.</div><div id="lyAssistantMessages" class="ly-assistant-messages"></div><div><div class="ly-assistant-tools"><button type="button" data-assistant-clear>Xóa lịch sử trên thiết bị</button></div><div class="ly-assistant-compose"><textarea id="lyAssistantInput" placeholder="Ví dụ: Tạo phiếu nhập 10 kg Đường"></textarea><button type="button" data-assistant-voice title="Ra lệnh bằng giọng nói" aria-label="Ra lệnh bằng giọng nói">🎙️</button><button type="button" data-assistant-send>Gửi</button></div></div>`;document.body.appendChild(drawer);
  launcher.addEventListener('click',()=>toggle());drawer.querySelector('[data-assistant-close]').addEventListener('click',()=>toggle(false));drawer.querySelector('[data-assistant-send]').addEventListener('click',submit);drawer.querySelector('[data-assistant-voice]').addEventListener('click',startVoice);drawer.querySelector('[data-assistant-clear]').addEventListener('click',()=>{if(confirm('Xóa toàn bộ lịch sử trợ lý trên thiết bị này?'))clearMessages();});
  drawer.querySelector('#lyAssistantInput').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit();}});
  drawer.addEventListener('click',async event=>{const id=event.target?.dataset?.confirmDraft;if(!id)return;const message=state.messages.find(row=>row.draft?.id===id);if(!message)return;try{await executeDraft(message.draft);toggle(false);}catch(error){await addMessage({id:uid(),role:'assistant',content:error?.message||String(error),created_at:now()});}});
}
async function boot(){installUi();state.messages=await readMessages();state.ready=true;renderMessages();}

window.__lyLocalAssistant={version:VERSION,parseDraft,reportReply,assistantReply,executeDraft,startVoice,clearMessages,status:()=>({version:VERSION,ready:state.ready,messageCount:state.messages.length,storage:'indexeddb-device-only',reports:'read-only-current-snapshot',voice:'browser-speech-with-consent'})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
