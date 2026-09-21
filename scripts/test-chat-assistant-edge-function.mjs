import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const client=await fs.readFile(new URL('../ly-local-chatbot.js',import.meta.url),'utf8');
const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');
assert.doesNotMatch(client,/functions\.invoke|lat-yen-chat|api\.openai\.com|OPENAI_API_KEY|fetch\s*\(/,'chatbot runtime must not contain any remote request path');
assert.doesNotMatch(loader,/chatLocalOnly|ly-chat-local-only/,'the obsolete network-blocking patch must not be loaded after removing the network path');
assert.match(client,/local-rules-engine-no-network/);assert.match(client,/externalApi:false/);assert.match(client,/Chatbot xử lý hoàn toàn trên thiết bị, không gọi API/);
assert.match(client,/aria-haspopup','dialog/);assert.match(client,/safe-area-inset-bottom/);assert.match(client,/finally\{state\.thinking=false;renderMessages\(\);\}/,'assistant must always leave the waiting state');

const document={readyState:'loading',addEventListener(){},getElementById(){return null;},querySelector(){return null;}};
const window={currentWarehouseId:'w1',db:{warehouses:[{id:'w1',name:'Kho thử'}],ingredients:[{id:'i1',warehouse_id:'w1',name:'Đường',unit:'kg',ingredient_type:'purchased'}],products:[]}};
let remoteCalls=0;window.sb={functions:{async invoke(){remoteCalls++;throw new Error('must not run');}}};
const context={console,Date,Math,Promise,Intl,document,window,globalThis:null,setTimeout};context.globalThis=context;window.window=window;window.document=document;
vm.createContext(context);vm.runInContext(client,context);const assistant=window.__lyLocalAssistant;
assert.equal(await assistant.askAi('Hôm nay nên làm gì?','Trả lời hoàn toàn local'),'Trả lời hoàn toàn local');assert.equal(remoteCalls,0);
assert.equal(assistant.status().externalApi,false);assert.equal(assistant.status().storage,'indexeddb-device-only');
assert.equal(assistant.parseDraft('nhapp 2 kg Đường').kind,'import','common command typos must be understood locally');
assert.equal(assistant.parseDraft('xuatkho 2 kg Đường').kind,'export','joined warehouse commands must be understood locally');
console.log('Local-only assistant privacy, typo tolerance and zero-network contract: PASS');
