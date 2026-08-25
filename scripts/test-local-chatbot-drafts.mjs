import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../ly-local-chatbot.js',import.meta.url),'utf8');
assert.ok(source.includes("DB_NAME='lat_yen_local_assistant_v1'"));
assert.ok(source.includes('indexedDB.open(DB_NAME,1)'));
assert.ok(source.includes('Lịch sử chat chỉ lưu trên thiết bị này'));
assert.ok(source.includes('câu hỏi hiện tại, tối đa 6 tin gần nhất và bản tóm tắt dữ liệu tối thiểu được gửi bảo mật'));
assert.ok(!source.includes('localStorage'),'assistant history must not use LocalStorage');
for(const forbidden of [".rpc(",".from(",'saveImportReceipt?.','saveExportReceipt?.','saveStocktakeReceipt?.','saveSaleReceipt?.'])assert.ok(!source.includes(forbidden),`assistant must not directly commit business data: ${forbidden}`);
assert.ok(!source.includes('SpeechRecognition'),'voice recognition must be fully removed');
assert.ok(!source.includes('data-assistant-voice'),'the unused voice button must be removed');
assert.ok(source.includes('ly-assistant-send'),'send control must have an animated visual');
assert.ok(source.includes('@keyframes ly-assistant-send'),'send icon animation must be defined');
assert.ok(!source.includes('data-suggestion-message'),'suggestions must never be copied back into the chat input');
assert.ok(source.includes('const answer=await askAi(content,reply.content,reply)'),'every response, including draft clarification, must be conversationally rewritten through the authenticated ChatGPT API');
assert.ok(source.includes("mode:'business_draft'"),'ChatGPT must receive safe structured draft context without owning the transaction');
assert.ok(source.includes("await retireDrafts();await addMessage"),'a new command must retire links to older drafts');
assert.ok(source.includes("message.draft=null;message.draft_retired_at=now()"),'an opened form must retire its draft link while retaining the chat message');
for(const forbidden of ['MediaRecorder','getUserMedia'])assert.ok(!source.includes(forbidden),`assistant must not capture or retain raw audio: ${forbidden}`);

let formOpen=false;
function makeForm(){formOpen=false;return {classList:{contains(name){return name==='open'&&formOpen;}},querySelector(){return null;},scrollIntoView(){}};}
let form=makeForm();
const input={value:'',dispatchEvent(){},focus(){},setSelectionRange(){}};
const importsPanel={classList:{active:false,contains(name){return name==='active'&&this.active;}}};
const elements=new Map([['imports',importsPanel],['inlineImportReceiptForm',form],['toggleImportReceiptBtn',{click(){formOpen=true;opened.push(['toggle']);}}],['receiptNote',{value:''}],['receiptNo',{value:''}],['receiptDate',{value:''}],['lyAssistantInput',input]]);
const opened=[];
let renderForm=true;
const navButton={click(){opened.push(['panel','imports']);importsPanel.classList.active=true;if(renderForm){form=makeForm();elements.set('inlineImportReceiptForm',form);}}};
const document={
  readyState:'loading',addEventListener(){},querySelector(selector){if(selector.includes('data-panel="imports"'))return navButton;return null;},
  getElementById(id){return elements.get(id)||null;},
  createElement(){return {appendChild(){},setAttribute(){},addEventListener(){},classList:{toggle(){}},dataset:{}};}
};
const currentIso=new Date().toISOString();
const context={console,Date,Math,Promise,Event:class Event{constructor(type,options){this.type=type;this.options=options;}},setTimeout(fn){fn();return 1;},confirm(){return true;},document,window:{
  currentWarehouseId:'w1',db:{warehouses:[{id:'w1',name:'Kho chính'}],ingredients:[{id:'i1',warehouse_id:'w1',name:'Đường',unit:'kg',ingredient_type:'purchased'},{id:'i2',warehouse_id:'w1',name:'Cà phê A',unit:'kg',ingredient_type:'purchased'},{id:'i3',warehouse_id:'w1',name:'Cà phê B',unit:'kg',ingredient_type:'purchased'},{id:'i4',warehouse_id:'w2',name:'Cà phê C',unit:'kg',ingredient_type:'purchased'},{id:'i5',warehouse_id:'w1',name:'Cà phê pha sẵn',unit:'lít',ingredient_type:'prepared'}],products:[{id:'p1',name:'Cà phê sữa'}],inventory:[{warehouse_id:'w1',ingredient_id:'i1',quantity:25}],sales:[{id:'s1',warehouse_id:'w1',sold_at:currentIso,total_amount:120000},{id:'s2',warehouse_id:'w1',sold_at:'2026-08-10T08:00:00+07:00',total_amount:40000}],saleItems:[{sale_id:'s1',product_id:'p1',quantity:3},{sale_id:'s2',product_id:'p1',quantity:1}],cashflows:[{warehouse_id:'w1',entry_type:'income',entry_date:currentIso,amount:500000},{warehouse_id:'w1',entry_type:'expense',entry_date:currentIso,amount:125000}]},
},globalThis:null};
context.globalThis=context;context.window.window=context.window;context.window.document=document;
vm.createContext(context);vm.runInContext(source,context);
const assistant=context.window.__lyLocalAssistant;

assert.match(assistant.reportReply('Báo cáo doanh thu hôm nay').content,/120\.000 đ/);
assert.match(assistant.reportReply('Báo cáo doanh thu hôm nay').content,/Cà phê sữa/);
assert.match(assistant.reportReply('Tồn kho hiện tại').content,/Đường 25/);
assert.match(assistant.reportReply('Thu chi hôm nay').content,/chênh lệch 375\.000 đ/i);
assert.match(assistant.reportReply('Báo cáo doanh thu từ 01/08/2026 đến 18/08/2026').content,/từ 01\/08\/2026 đến 18\/08\/2026/);
assert.match(assistant.reportReply('Báo cáo doanh thu từ 01/08/2026 đến 18/08/2026').content,/40\.000 đ/,'custom range must include only sales inside the requested dates');
assert.match(assistant.reportReply('Báo cáo doanh thu từ 2026-08-18 đến 2026-08-01').content,/từ 01\/08\/2026 đến 18\/08\/2026/,'reversed custom dates must be normalized');
assert.match(assistant.reportReply('Báo cáo doanh thu ngày hôm qua').content,/hôm qua \(\d{2}\/\d{2}\/\d{4}\)/,'yesterday must resolve to one explicit date');
assert.match(assistant.reportReply('Báo cáo tuần này').content,/tuần này, từ \d{2}\/\d{2}\/\d{4} đến \d{2}\/\d{2}\/\d{4}/);
assert.match(assistant.reportReply('Báo cáo tuần trước').content,/tuần trước, từ \d{2}\/\d{2}\/\d{4} đến \d{2}\/\d{2}\/\d{4}/);
assert.match(assistant.reportReply('Báo cáo tháng trước').content,/tháng trước, từ \d{2}\/\d{2}\/\d{4} đến \d{2}\/\d{2}\/\d{4}/);
assert.match(assistant.reportReply('Báo cáo quý này').content,/quý này, từ/);
assert.match(assistant.reportReply('Báo cáo năm trước').content,/năm trước, từ/);
assert.match(assistant.reportReply('Báo cáo từ đầu tháng đến nay').content,/từ đầu tháng \(\d{2}\/\d{2}\/\d{4}\) đến nay/);
assert.match(assistant.reportReply('Báo cáo 3 tuần vừa qua').content,/3 tuần gần nhất, từ/);
assert.match(assistant.reportReply('Báo cáo 2 tháng gần đây').content,/2 tháng gần nhất, từ/);
assert.match(assistant.reportReply('Báo cáo cuối tháng trước').content,/cuối tháng trước \(\d{2}\/\d{2}\/\d{4}\)/);
assert.match(assistant.reportReply('Báo cáo tuần sau').content,/tuần sau, từ/);
assert.equal(assistant.parseDraft('Báo cáo doanh thu hôm nay'),null,'reports must remain read-only and never become a business draft');

const create=assistant.parseDraft('Tạo phiếu nhập 10 kg Đường');
assert.equal(create.action,'create');assert.equal(create.kind,'import');assert.equal(create.warehouse_id,'w1');assert.equal(create.items[0].id,'i1');assert.equal(create.items[0].quantity,10);
assert.equal(assistant.parseDraft('Tạo phiếu nhập Đường').items[0].quantity,null,'missing quantity must remain blank instead of defaulting to one');
assert.equal(assistant.parseDraft('Tạo phiếu nhập hai kg Đường').items[0].quantity,2,'common Vietnamese number words must be understood');
const ambiguous=assistant.parseDraft('Tạo phiếu nhập 10 kg cà phê');
assert.equal(ambiguous.items.length,0);assert.equal(ambiguous.clarifications.length,1);assert.equal(ambiguous.clarifications[0].options.map(row=>row.name).join('|'),'Cà phê A|Cà phê B','suggestions must be limited to valid items in the selected warehouse');
assert.match(assistant.assistantReply('Tạo phiếu nhập 10 kg cà phê').content,/cập nhật ngay vào bản nháp/);
await assert.rejects(()=>assistant.executeDraft(ambiguous),/cần chọn đúng mặt hàng/);
assert.equal(assistant.chooseDraftItem(ambiguous,ambiguous.clarifications[0].id,'i3'),true);assert.equal(ambiguous.items[0].name,'Cà phê B');assert.equal(ambiguous.items[0].quantity,10);assert.equal(assistant.draftReady(ambiguous),true);
const withHeader=assistant.parseDraft('Tạo phiếu nhập số PN-100 ngày 18/08/2026 10 kg Đường');
assert.equal(withHeader.receipt_code,'PN-100');assert.equal(withHeader.receipt_date,'2026-08-18');
const yesterdayDraft=assistant.parseDraft('Tạo phiếu nhập hôm qua 2 kg Đường');
const expectedYesterday=new Date();expectedYesterday.setDate(expectedYesterday.getDate()-1);assert.equal(yesterdayDraft.receipt_date,`${expectedYesterday.getFullYear()}-${String(expectedYesterday.getMonth()+1).padStart(2,'0')}-${String(expectedYesterday.getDate()).padStart(2,'0')}`);
const dayAfterTomorrowDraft=assistant.parseDraft('Tạo phiếu nhập ngày kia 2 kg Đường');const expectedDayAfterTomorrow=new Date();expectedDayAfterTomorrow.setDate(expectedDayAfterTomorrow.getDate()+2);assert.equal(dayAfterTomorrowDraft.receipt_date,`${expectedDayAfterTomorrow.getFullYear()}-${String(expectedDayAfterTomorrow.getMonth()+1).padStart(2,'0')}-${String(expectedDayAfterTomorrow.getDate()).padStart(2,'0')}`,'“ngày kia” must mean two days in the future, unlike “hôm kia”');
const openOnly=assistant.parseDraft('Tạo phiếu nhập');await assert.rejects(()=>assistant.executeDraft(openOnly),/cần chọn đúng mặt hàng/,'an empty receipt must not open an empty business form');
await assistant.executeDraft(withHeader);assert.equal(elements.get('receiptNo').value,'PN-100');assert.equal(elements.get('receiptDate').value,'2026-08-18');
elements.delete('inlineImportReceiptForm');
renderForm=false;
const missingForm=assistant.parseDraft('Tạo phiếu nhập 1 kg Đường');
await assert.rejects(()=>assistant.executeDraft(missingForm),/Không tìm thấy form phiếu/);
assert.equal(missingForm.status,'pending','failed navigation must remain retryable');
const remove=assistant.parseDraft('Xóa phiếu kiểm kê số KK-001');
assert.equal(remove.action,'delete');assert.equal(remove.kind,'stocktake');assert.equal(remove.receipt_code,'KK-001');
const edit=assistant.parseDraft('Sửa phiếu bán BH-009');
assert.equal(edit.action,'edit');assert.equal(edit.kind,'sale');assert.equal(edit.receipt_code,'BH-009');
assert.equal(assistant.parseDraft('Cho tôi xem tồn kho'),null);
assert.match(assistant.assistantReply('Xin chào').content,/Chào bạn/);
assert.equal(assistant.assistantReply('Sửa phiếu bán').draft,undefined,'an edit request without a receipt code must ask for clarification instead of opening a guessed draft');

console.log('Device-only assistant draft and confirmation contract: PASS');
