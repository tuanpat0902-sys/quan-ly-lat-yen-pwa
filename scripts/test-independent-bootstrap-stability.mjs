import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-independent-bootstrap.js',import.meta.url),'utf8');
const indexSource=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
let navInitializations=0;
let renders=0;
let hydrations=0;
let v3Boots=0;
let host=null;
const timers=[];
const nav={querySelector(selector){return selector==='button[data-panel]'?{}:null;}};
const panel={id:'sales',innerHTML:'<h2>Bán hàng</h2>'};
const navigate=()=>true;
const router={
  authoritative:true,
  navigate,
  status(){return {activePanel:'sales',installed:true};}
};
const document={
  readyState:'complete',
  body:{prepend(value){host=value;}},
  documentElement:{setAttribute(){}},
  createElement(){return {id:'',style:{},innerHTML:'',querySelector(){return {addEventListener(){}};},remove(){host=null;}};},
  getElementById(id){if(id==='lyIndependentBootstrapStatus')return host;if(id==='nav')return nav;return null;},
  querySelector(selector){if(selector==='main')return null;if(selector==='#nav'||selector==='.panel.active')return selector==='#nav'?nav:panel;return null;},
  addEventListener(){}
};
const context={
  console,
  Date,
  document,
  setTimeout(callback){timers.push(callback);return timers.length;},
  window:{
    __LY_APP_VERSION:'3.0.6',
    __lyFreshCoreV3:{version:'3.0.0-shell.1',authoritative:true,router,store:{getState(){return {activePanel:'sales'};}}},
    __lyFreshCoreV3Runtime:{async boot(){v3Boots++;return true;},status(){return {phase:'ready',navigationAuthoritative:true};}},
    __lyFreshCoreV2Shadow:{status(){return {phase:'ready'};}},
    __lyFreshCoreV2LegacyHydration:{hydrate(){hydrations++;return true;}},
    showTab:navigate,
    navInit(){navInitializations++;},
    renderWarehouseSelect(){},
    renderAll(){renders++;},
    addEventListener(){}
  }
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-independent-bootstrap.js'});
await context.window.__lyIndependentBootstrap.attempt(false);

const status=context.window.__lyIndependentBootstrap.status();
assert.equal(status.ready,true);
assert.equal(status.attempts,1,'once V3 is authoritative, queued rescue attempts must stop');
assert.equal(status.shellRepairs,0,'a healthy V3 shell must never be rebuilt');
assert.equal(navInitializations,0,'bootstrap must preserve the current menu instead of rebuilding navigation');
assert.equal(renders,0,'bootstrap must not continuously render an already populated active panel');
assert.doesNotMatch(source,/window\.renderAll\?\.\(\)/,'V3 bootstrap repair must not use broad renderAll recovery');
assert.equal(hydrations,0,'bootstrap must not re-hydrate an already healthy shell');
assert.equal(v3Boots,1,'bootstrap may confirm V3 boot once without invoking V2 final ownership');
assert.equal(host,null,'startup diagnostic must be removed after V3 readiness');
assert.ok(source.includes("querySelector('button[data-panel]')"),'navigation repair must remain conditional');
assert.doesNotMatch(source,/__lyFreshCoreV2FinalOwnership/,'bootstrap must never restore V2 final ownership');
assert.match(indexSource,/showTab\(\s*selectedPanel,/,'navigation rebuild must restore the active menu and panel');
assert.ok(indexSource.includes('ACTIVE_PANEL_STORAGE_KEY'),'navigation rebuild must use persisted panel state');
console.log('Independent bootstrap V3 active-menu stability: PASS');
