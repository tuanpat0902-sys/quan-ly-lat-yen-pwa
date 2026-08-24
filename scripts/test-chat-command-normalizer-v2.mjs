import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../ly-chat-command-normalizer-v2.js',import.meta.url),'utf8');
const products=[
 {id:'1',name:'ColdBrew Me Rừng',unit:'ly',active:true},
 {id:'2',name:'ColdBrew Dâu Dại',unit:'ly',active:true},
 {id:'3',name:'Dâu Tằm Kem Mây',unit:'ly',active:true},
 {id:'4',name:'Trà Thanh Xoài',unit:'ly',active:true},
 {id:'5',name:'Xoài Dừa Tuyết Sơn',unit:'ly',active:true},
 {id:'6',name:'Matcha Latte Xoài',unit:'ly',active:true}
];
const sandbox={
 window:{db:{products,ingredients:[]},currentWarehouseId:'',addEventListener(){}},
 db:{products,ingredients:[]},
 document:{readyState:'loading',addEventListener(){},getElementById(){return null}},
 setTimeout(){},console
};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
const api=sandbox.window.__lyChatCommandNormalizer;
assert.equal(api.version,'2026.08.25.2');

const ambiguous=api.analyzeSale('Bán 10 cốc nước me và 10 cốc nước dâu');
assert.equal(ambiguous.mode,'suggest');
assert.equal(ambiguous.unresolved.index,1);
assert.equal(ambiguous.unresolved.term,'dau');
assert.deepEqual(Array.from(ambiguous.unresolved.candidates,item=>item.name),['ColdBrew Dâu Dại','Dâu Tằm Kem Mây']);

const exact=api.analyzeSale('Bán 10 cốc ColdBrew Me Rừng và 10 cốc ColdBrew Dâu Dại');
assert.equal(exact.message,'Bán 10 ly ColdBrew Me Rừng và 10 ly ColdBrew Dâu Dại');

const typo=api.analyzeSale('Bán 10 chai thanh xoài');
assert.equal(typo.message,'Bán 10 ly Trà Thanh Xoài');

console.log('chat command normalizer v2 regression: OK');
