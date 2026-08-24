import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../ly-local-chatbot.js',import.meta.url),'utf8');
assert.ok(source.includes("DB_NAME='lat_yen_local_assistant_v1'"));
assert.ok(source.includes('indexedDB.open(DB_NAME,1)'));
assert.ok(source.includes('Lịch sử chat chỉ lưu trên thiết bị này'));
assert.ok(source.includes('câu hỏi hiện tại và bản tóm tắt dữ liệu tối thiểu được gửi bảo mật'));
assert.ok(!source.includes('localStorage'),'assistant history must not use LocalStorage');
for(const forbidden of [".rpc(",".from(",'saveImportReceipt?.','saveExportReceipt?.','saveStocktakeReceipt?.','saveSaleReceipt?.'])assert.ok(!source.includes(forbidden),`assistant must not directly commit business data: ${forbidden}`);
assert.ok(source.includes('window.SpeechRecognition||window.webkitSpeechRecognition'));
assert.ok(source.includes("recognition.lang='vi-VN'"));
assert.ok(source.includes('Trình duyệt có thể gửi âm thanh tới dịch vụ nhận dạng giọng nói trực tuyến'));
assert.ok(source.includes('ly-assistant-wave'),'voice control must use an animated visual');
assert.ok(source.includes('ly-voice-wave'),'voice control must render animated sound bars');
assert.ok(source.includes("await retireDrafts();await addMessage"),'a new command must retire links to older drafts');
assert.ok(source.includes("message.draft=null;message.draft_retired_at=now()"),'an opened form must retire its draft link while retaining the chat message');
for(const forbidden of ['MediaRecorder','getUserMedia'])assert.ok(!source.includes(forbidden),`assistant must not capture or retain raw audio: ${forbidden}`);

let formOpen=false;
const form={classList:{contains(name){return name==='open'&&formOpen;}},querySelector(){return null;},scrollIntoView(){}};
const voiceButton={classList:{add(){},remove(){}},setAttribute(){}};
const input={value:'',dispatchEvent(){},focus(){},setSelectionRange(){}};
const elements=new Map([['imports',{}],['inlineImportReceiptForm',form],['toggleImportReceiptBtn',{click(){formOpen=true;opened.push(['toggle']);}}],['receiptNote',{value:''}],['receiptNo',{value:''}],['receiptDate',{value:''}],['lyAssistantInput',input]]);
const opened=[];
const navButton={click(){opened.push(['panel','imports']);}};
const document={
  readyState:'loading',addEventListener(){},querySelector(selector){if(selector.includes('data-panel="imports"'))return navButton;if(selector==='[data-assistant-voice]')return voiceButton;return null;},
  getElementById(id){return elements.get(id)||null;},
  createElement(){return {appendChild(){},setAttribute(){},addEventListener(){},classList:{toggle(){}},dataset:{}};}
};
let recognition;
class SpeechRecognitionMock{constructor(){recognition=this;}start(){this.onstart?.();}stop(){this.onend?.();}abort(){this.onend?.();}}
const currentIso=new Date().toISOString();
const context={console,Date,Math,Promise,Event:class Event{constructor(type,options){this.type=type;this.options=options;}},setTimeout(fn){fn();return 1;},confirm(){return true;},document,window:{
  currentWarehouseId:'w1',db:{warehouses:[{id:'w1',name:'Kho chính'}],ingredients:[{id:'i1',warehouse_id:'w1',name:'Đường',unit:'kg',ingredient_type:'purchased'},{id:'i2',warehouse_id:'w1',name:'Cà phê A',unit:'kg',ingredient_type:'purchased'},{id:'i3',warehouse_id:'w1',name:'Cà phê B',unit:'kg',ingredient_type:'purchased'},{id:'i4',warehouse_id:'w2',name:'Cà phê C',unit:'kg',ingredient_type:'purchased'},{id:'i5',warehouse_id:'w1',name:'Cà phê pha sẵn',unit:'lít',ingredient_type:'prepared'}],products:[{id:'p1',name:'Cà phê sữa'}],inventory:[{warehouse_id:'w1',ingredient_id:'i1',quantity:25}],sales:[{id:'s1',warehouse_id:'w1',sold_at:currentIso,total_amount:120000},{id:'s2',warehouse_id:'w1',sold_at:'2026-08-10T08:00:00+07:00',total_amount:40000}],saleItems:[{sale_id:'s1',product_id:'p1',quantity:3},{sale_id:'s2',product_id:'p1',quantity:1}],cashflows:[{warehouse_id:'w1',entry_type:'income',entry_date:currentIso,amount:500000},{warehouse_id:'w1',entry_type:'expense',entry_date:currentIso,amount:125000}]},
  SpeechRecognition:SpeechRecognitionMock,
},globalThis:null};
context.globalThis=context;context.window.window=context.window;context.window.document=document;
vm.createContext(context);vm.runInContext(source,context);
const assistant=context.window.__lyLocalAssistant;

assert.equal(await assistant.startVoice(),true);
assert.equal(recognition.lang,'vi-VN');assert.equal(recognition.continuous,false);assert.equal(recognition.interimResults,false);
recognition.onresult({results:[[{transcript:'Tạo phiếu nhập'}]]});
assert.equal(input.value,'Tạo phiếu nhập');assert.equal(assistant.status().messageCount,0,'voice transcript must stay in the input until the user presses Send');
assert.match(assistant.reportReply('Báo cáo doanh thu hôm nay').content,/120\.000 đ/);
assert.match(assistant.reportReply('Báo cáo doanh thu hôm nay').content,/Cà phê sữa/);
assert.match(assistant.reportReply('Tồn kho hiện tại').content,/Đường 25/);
assert.match(assistant.reportReply('Thu chi hôm nay').content,/chênh lệch 375\.000 đ/i);
assert.match(assistant.reportReply('Báo cáo doanh thu từ 01/08/2026 đến 18/08/2026').content,/từ 01\/08\/2026 đến 18\/08\/2026/);
assert.match(assistant.reportReply('Báo cáo doanh thu từ 01/08/2026 đến 18/08/2026').content,/40\.000 đ/,'custom range must include only sales inside the requested dates');
assert.match(assistant.reportReply('Báo cáo doanh thu từ 2026-08-18 đến 2026-08-01').content,/từ 01\/08\/2026 đến 18\/08\/2026/,'reversed custom dates must be normalized');
assert.equal(assistant.parseDraft('Báo cáo doanh thu hôm nay'),null,'reports must remain read-only and never become a business draft');

const create=assistant.parseDraft('Tạo phiếu nhập 10 kg Đường');
assert.equal(create.action,'create');assert.equal(create.kind,'import');assert.equal(create.warehouse_id,'w1');assert.equal(create.items[0].id,'i1');assert.equal(create.items[0].quantity,10);
assert.equal(assistant.parseDraft('Tạo phiếu nhập Đường').items[0].quantity,null,'missing quantity must remain blank instead of defaulting to one');
assert.equal(assistant.parseDraft('Tạo phiếu nhập hai kg Đường').items[0].quantity,2,'common Vietnamese number words must be understood');
const ambiguous=assistant.parseDraft('Tạo phiếu nhập 10 kg cà phê');
assert.equal(ambiguous.items.length,0);assert.equal(ambiguous.ambiguities.length,1);assert.equal(ambiguous.ambiguities[0].options.map(row=>row.name).join('|'),'Cà phê A|Cà phê B','suggestions must be limited to valid items in the selected warehouse');
assert.match(assistant.assistantReply('Tạo phiếu nhập 10 kg cà phê').content,/không tự đoán/);
await assert.rejects(()=>assistant.executeDraft(ambiguous),/cần chọn đúng mặt hàng/);
assert.equal(assistant.chooseDraftItem(ambiguous,ambiguous.ambiguities[0].id,'i3'),true);assert.equal(ambiguous.items[0].name,'Cà phê B');assert.equal(ambiguous.items[0].quantity,10);
const withHeader=assistant.parseDraft('Tạo phiếu nhập số PN-100 ngày 18/08/2026 10 kg Đường');
assert.equal(withHeader.receipt_code,'PN-100');assert.equal(withHeader.receipt_date,'2026-08-18');
const openOnly=assistant.parseDraft('Tạo phiếu nhập');
await assistant.executeDraft(openOnly);
assert.equal(openOnly.status,'opened');assert.equal(formOpen,true);assert.equal(elements.get('receiptNote').value,'Bản nháp từ Trợ lý Lát Yên');
assert.deepEqual(opened.map(row=>row[0]),['panel','toggle']);
await assistant.executeDraft(openOnly);assert.equal(opened.filter(row=>row[0]==='toggle').length,1,'reopening an already-open draft must not close the form');
await assistant.executeDraft(withHeader);assert.equal(elements.get('receiptNo').value,'PN-100');assert.equal(elements.get('receiptDate').value,'2026-08-18');
elements.delete('inlineImportReceiptForm');
const missingForm=assistant.parseDraft('Tạo phiếu nhập');
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
