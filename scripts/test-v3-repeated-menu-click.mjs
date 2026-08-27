import assert from 'node:assert/strict';

globalThis.CSS={escape:value=>String(value)};
const panel={id:'sales',classList:{contains:()=>true,toggle(){}},innerHTML:'ready'};
const button={dataset:{panel:'sales'},classList:{toggle(){}},setAttribute(){},removeAttribute(){}};
globalThis.document={
  getElementById:id=>id==='sales'?panel:null,
  querySelector:selector=>selector.includes('button')?button:panel,
  querySelectorAll:selector=>selector.includes('.panel')?[panel]:[button]
};
globalThis.requestAnimationFrame=fn=>{fn();return 1;};
globalThis.setTimeout=fn=>{fn();return 1;};
let legacyCalls=0,patches=0,authCalls=0;
globalThis.window={
  showTab(){legacyCalls++;},
  dispatchEvent(){},
  __lyMenuSecurity:{authorize(id,btn,proceed){authCalls++;return true;}}
};
globalThis.CustomEvent=class{constructor(type,init){this.type=type;this.detail=init?.detail;}};
globalThis.localStorage={setItem(){}};

const {createRouter}=await import('../src-v3/app/router.js?repeat-click-test');
const store={patch(){patches++;},getState(){return {activePanel:'sales'};}};
const events={emit(){}};
const router=createRouter({store,events,legacyNavigate:window.showTab,legacyRender(){}});
assert.equal(router.install(),true);
assert.equal(router.navigate('sales',button),true);
assert.equal(router.navigate('sales',button),true);
assert.equal(authCalls,2,'every menu click must reach authorization');
assert.equal(legacyCalls,2,'every authorized click must reach legacy renderer state owner');
assert.equal(patches>=3,true,'router store must accept repeated navigation updates');
console.log('V3 repeated menu click navigation: PASS');
