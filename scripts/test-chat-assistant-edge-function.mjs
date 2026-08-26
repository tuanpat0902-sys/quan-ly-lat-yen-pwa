import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const client=await fs.readFile(new URL('../ly-local-chatbot.js',import.meta.url),'utf8');
const edge=await fs.readFile(new URL('../supabase/functions/lat-yen-chat/index.ts',import.meta.url),'utf8');
assert.match(edge,/OPENAI_API_KEY/);assert.match(edge,/api\.openai\.com\/v1\/responses/);assert.match(edge,/gpt-5\.6/);
assert.match(edge,/auth\.getUser\(token\)/);assert.match(edge,/RATE_LIMITED/);assert.match(edge,/Access-Control-Allow-Origin/);
assert.match(edge,/recent_context/);assert.match(edge,/store:false/);assert.match(edge,/không tự suy diễn/);
assert.match(edge,/AbortSignal\.timeout\(AI_TIMEOUT_MS\)/);assert.match(edge,/REQUEST_TOO_LARGE/);assert.match(edge,/Cache-Control/);
assert.match(client,/aiRetryAt/);assert.match(client,/aria-haspopup','dialog/);assert.match(client,/safe-area-inset-bottom/);
assert.match(edge,/input:\[\.\.\.recentContext/,'recent turns must be sent as real Responses API role messages');assert.match(edge,/resolved_follow_up/);assert.match(edge,/tính liên tục/);
assert.doesNotMatch(edge,/sk-[A-Za-z0-9_-]{12,}/);assert.doesNotMatch(client,/OPENAI_API_KEY/);assert.doesNotMatch(client,/api\.openai\.com/);

const document={readyState:'loading',addEventListener(){},getElementById(){return null;},querySelector(){return null;}};
const window={currentWarehouseId:'w1',db:{warehouses:[{id:'w1',name:'Kho thử'}],ingredients:[],products:[]}};
const context={console,Date,Math,Promise,Intl,document,window,globalThis:null,setTimeout};context.globalThis=context;window.window=window;window.document=document;
vm.createContext(context);vm.runInContext(client,context);const assistant=window.__lyLocalAssistant;
window.sb={functions:{async invoke(name,request){assert.equal(name,'lat-yen-chat');assert.equal(request.body.message,'Hôm nay nên làm gì?');assert.ok(Array.isArray(request.body.recent_context));return {data:{answer:'Bạn nên kiểm tra tồn kho trước nhé.'},error:null};}}};
assert.equal(await assistant.askAi('Hôm nay nên làm gì?','Trả lời dự phòng'),'Bạn nên kiểm tra tồn kho trước nhé.');
window.sb.functions.invoke=async()=>({data:null,error:new Error('offline')});
assert.equal(await assistant.askAi('Câu hỏi khác','Trả lời dự phòng'),'Trả lời dự phòng');
console.log('Authenticated OpenAI assistant edge contract and local fallback: PASS');
