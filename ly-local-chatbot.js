(()=>{
'use strict';
const VERSION='2026.08.24.1';
if(window.__lyLocalAssistant?.version===VERSION)return;
const DB_NAME='lat_yen_local_assistant_v1',STORE='messages';
const state={messages:[],open:false,memory:[],ready:false};
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
function assistantReply(message){
  const draft=parseDraft(message);
  if(draft)return {content:`Mình đã tạo đề xuất cục bộ. ${draftSummary(draft)} Hãy kiểm tra rồi xác nhận để mở bản nháp trong form chính thức.`,draft};
  return {content:'Mình chỉ thao tác bằng bản nháp. Hãy thử: “Tạo phiếu nhập 10 kg Đường”, “Sửa phiếu bán BH-001” hoặc “Xóa phiếu kiểm kê KK-001”.'};
}

function navigate(panel){
  const button=document.querySelector?.(`#nav button[data-panel="${panel}"]`);
  if(typeof window.showTab==='function')window.showTab(panel,button||null);
}
function setValue(id,value){const element=document.getElementById?.(id);if(element&&value!==undefined)element.value=String(value);}
function openCreateDraft(draft){
  const panel=draft.kind==='sale'?'sales':draft.kind==='stocktake'?'stocktake':'imports';navigate(panel);
  if(draft.kind==='import'){
    window.renderImports?.();window.toggleImportReceiptForm?.(true);
    const holder=document.getElementById?.('importReceiptLines');if(holder&&draft.items.length)holder.replaceChildren();
    for(const item of draft.items)window.addImportReceiptLine?.(item.id,'',item.quantity,'');
    setValue('receiptNote','Bản nháp từ Trợ lý Lát Yên');
  }else if(draft.kind==='export'){
    window.renderImports?.();window.toggleExportReceiptForm?.(true);
    const holder=document.getElementById?.('exportReceiptLines');if(holder&&draft.items.length)holder.replaceChildren();
    for(const item of draft.items)window.addExportReceiptLine?.(item.id,item.quantity,'');
    setValue('exportReceiptReason','Bản nháp từ Trợ lý Lát Yên');
  }else if(draft.kind==='stocktake'){
    window.renderStocktake?.();window.toggleStocktakeForm?.(true);
    const holder=document.getElementById?.('stocktakeReceiptLines');if(holder&&draft.items.length)holder.replaceChildren();
    for(const item of draft.items)window.addStocktakeReceiptLine?.(item.id,item.quantity);
    setValue('stocktakeReceiptNote','Bản nháp từ Trợ lý Lát Yên');
  }else{
    window.renderSales?.();window.toggleSaleReceiptForm?.(true);
    const holder=document.getElementById?.('saleReceiptLines');if(holder&&draft.items.length)holder.replaceChildren();
    for(const item of draft.items)window.addSaleReceiptLine?.(item.id,item.quantity);
    setValue('saleReceiptNote','Bản nháp từ Trợ lý Lát Yên');
  }
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
  if(!draft||draft.status!=='pending')return false;
  if(draft.action==='create')openCreateDraft(draft);
  else{
    if(!draft.receipt_code)throw new Error('Cần nhập rõ số phiếu trước khi tiếp tục.');
    const panel=draft.kind==='sale'?'sales':draft.kind==='stocktake'?'stocktake':'imports';navigate(panel);
    await new Promise(resolve=>setTimeout(resolve,120));
    const button=receiptButton(draft);if(!button)throw new Error(`Không tìm thấy phiếu ${draft.receipt_code} trong kho đang chọn.`);
    button.click();
  }
  draft.status='opened';draft.opened_at=now();await writeMessage(state.messages.find(message=>message.draft?.id===draft.id)||{id:uid(),role:'assistant',content:draftSummary(draft),draft,created_at:now()});
  renderMessages();return true;
}

function messageHtml(message){
  const draft=message.draft;
  const action=draft?.status==='pending'?`<div class="ly-assistant-draft"><b>${esc(draftSummary(draft))}</b><button type="button" data-confirm-draft="${esc(draft.id)}">${draft.action==='delete'?'Tiếp tục đến xác nhận xóa':'Mở bản nháp để kiểm tra'}</button></div>`:draft?`<small class="ly-assistant-done">Đã mở trong form nghiệp vụ</small>`:'';
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
function toggle(force){state.open=force===undefined?!state.open:Boolean(force);document.getElementById?.('lyAssistantDrawer')?.classList.toggle('is-open',state.open);}
function installUi(){
  if(document.getElementById?.('lyAssistantLauncher'))return;
  const style=document.createElement('style');style.id='lyAssistantStyles';style.textContent=`
.ly-assistant-launcher{position:fixed;right:18px;bottom:18px;z-index:95;border:0;border-radius:999px;background:#0f766e;color:#fff;padding:12px 16px;font-weight:800;box-shadow:0 12px 32px rgba(15,118,110,.28)}
.ly-assistant-drawer{position:fixed;right:14px;bottom:72px;z-index:96;width:min(410px,calc(100vw - 28px));height:min(620px,calc(100vh - 100px));display:none;grid-template-rows:auto auto 1fr auto;background:#fff;border:1px solid #dbe5e4;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.24);overflow:hidden}.ly-assistant-drawer.is-open{display:grid}
.ly-assistant-head{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:1px solid #e5e7eb}.ly-assistant-head h3{margin:0}.ly-assistant-head button{border:0;background:transparent;font-size:22px}.ly-assistant-privacy{padding:9px 14px;background:#ecfdf5;color:#065f46;font-size:12px}.ly-assistant-messages{padding:12px;overflow:auto;display:flex;flex-direction:column;gap:9px}.ly-assistant-message{max-width:88%;padding:10px 11px;border-radius:13px;background:#f1f5f9;line-height:1.4;font-size:13px}.ly-assistant-message.is-user{align-self:flex-end;background:#0f766e;color:#fff}.ly-assistant-draft{display:grid;gap:8px;margin-top:9px;padding:9px;background:#fff;border:1px solid #cbd5e1;border-radius:10px;color:#334155}.ly-assistant-draft button{border:0;border-radius:8px;background:#0f766e;color:#fff;padding:8px;font-weight:700}.ly-assistant-done{display:block;margin-top:6px;color:#047857}.ly-assistant-empty{margin:auto;color:#64748b;text-align:center;padding:18px}.ly-assistant-compose{display:grid;grid-template-columns:1fr auto;gap:8px;padding:11px;border-top:1px solid #e5e7eb}.ly-assistant-compose textarea{resize:none;min-height:44px;max-height:100px;border:1px solid #cbd5e1;border-radius:10px;padding:9px}.ly-assistant-compose button{border:0;border-radius:10px;background:#0f766e;color:#fff;padding:0 13px;font-weight:800}.ly-assistant-tools{display:flex;justify-content:flex-end;padding:0 12px 9px}.ly-assistant-tools button{border:0;background:transparent;color:#b42318;font-size:12px}
@media(max-width:520px){.ly-assistant-launcher{right:12px;bottom:12px}.ly-assistant-drawer{inset:10px;width:auto;height:auto;bottom:70px}}
`;document.head.appendChild(style);
  const launcher=document.createElement('button');launcher.id='lyAssistantLauncher';launcher.className='ly-assistant-launcher';launcher.type='button';launcher.textContent='Trợ lý Lát Yên';launcher.setAttribute('aria-controls','lyAssistantDrawer');document.body.appendChild(launcher);
  const drawer=document.createElement('section');drawer.id='lyAssistantDrawer';drawer.className='ly-assistant-drawer';drawer.innerHTML=`<div class="ly-assistant-head"><h3>Trợ lý Lát Yên</h3><button type="button" data-assistant-close aria-label="Đóng">×</button></div><div class="ly-assistant-privacy">🔒 Lịch sử chat và đề xuất chỉ lưu trên thiết bị này. Trợ lý không tự lưu hay xóa phiếu.</div><div id="lyAssistantMessages" class="ly-assistant-messages"></div><div><div class="ly-assistant-tools"><button type="button" data-assistant-clear>Xóa lịch sử trên thiết bị</button></div><div class="ly-assistant-compose"><textarea id="lyAssistantInput" placeholder="Ví dụ: Tạo phiếu nhập 10 kg Đường"></textarea><button type="button" data-assistant-send>Gửi</button></div></div>`;document.body.appendChild(drawer);
  launcher.addEventListener('click',()=>toggle());drawer.querySelector('[data-assistant-close]').addEventListener('click',()=>toggle(false));drawer.querySelector('[data-assistant-send]').addEventListener('click',submit);drawer.querySelector('[data-assistant-clear]').addEventListener('click',()=>{if(confirm('Xóa toàn bộ lịch sử trợ lý trên thiết bị này?'))clearMessages();});
  drawer.querySelector('#lyAssistantInput').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit();}});
  drawer.addEventListener('click',async event=>{const id=event.target?.dataset?.confirmDraft;if(!id)return;const message=state.messages.find(row=>row.draft?.id===id);if(!message)return;try{await executeDraft(message.draft);toggle(false);}catch(error){await addMessage({id:uid(),role:'assistant',content:error?.message||String(error),created_at:now()});}});
}
async function boot(){installUi();state.messages=await readMessages();state.ready=true;renderMessages();}

window.__lyLocalAssistant={version:VERSION,parseDraft,assistantReply,executeDraft,clearMessages,status:()=>({version:VERSION,ready:state.ready,messageCount:state.messages.length,storage:'indexeddb-device-only'})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
