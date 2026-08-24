import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-fresh-core-v2-final-ownership.js',import.meta.url),'utf8');
let draftOpen=true,projectionCallback=null,refreshes=0,hydrations=0,safeRenders=0,fallbackRenders=0,deferredMarks=0;
const snapshot={salesData:{sales:[],items:[]}};
const context={
  console,Date,
  setTimeout(callback,delay){if(delay===700){projectionCallback=callback;return 700;}if(delay===0){callback();return 1;}return 2;},
  clearTimeout(){},
  CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},
  document:{readyState:'complete',addEventListener(){}},
  window:{
    __lyFreshCoreV2:{
      store:{getState(){return snapshot;}},
      async refreshCoreDomains(){refreshes++;return true;}
    },
    __lyFreshCoreV2LegacyHydration:{hydrate(value){assert.equal(value,snapshot);hydrations++;return true;}},
    v240HasActiveDraft(){return draftOpen;},
    v240MarkProjectionDeferred(){deferredMarks++;},
    v240ClearDeferredStatus(){},
    v235RequestBackgroundRender(){safeRenders++;return true;},
    renderAll(){fallbackRenders++;},
    addEventListener(){},dispatchEvent(){}
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-fresh-core-v2-final-ownership.js'});

const api=context.window.__lyFreshCoreV2FinalOwnership;
assert.equal(api.version,'2026.08.24.4');
assert.equal(api.status().active,true);
assert.equal(hydrations,0,'startup projection must not overwrite an already-open receipt');
assert.equal(safeRenders,0);
assert.equal(fallbackRenders,0);
assert.equal(typeof projectionCallback,'function');
assert.ok(deferredMarks>=1);

draftOpen=false;
projectionCallback();
assert.equal(hydrations,1,'the latest V2 snapshot must hydrate once after the receipt closes');
assert.equal(safeRenders,1);
assert.equal(fallbackRenders,0,'final ownership must prefer the interaction-safe renderer');

draftOpen=true;
const result=await api.refresh('test');
assert.equal(result,true);
assert.equal(refreshes,1,'cloud data may refresh while the receipt stays open');
assert.equal(hydrations,1,'refreshed data must not project over the open receipt');
assert.equal(typeof projectionCallback,'function');

draftOpen=false;
projectionCallback();
assert.equal(hydrations,2);
assert.equal(safeRenders,2);
assert.equal(api.status().pendingProjection,'');
console.log('Fresh Core V2 open-receipt draft safety: PASS');
