import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../ly-runtime-error-boundary.js',import.meta.url),'utf8');
const index=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');
const sw=await fs.readFile(new URL('../sw.js',import.meta.url),'utf8');
const listeners=new Map();
let errorLogs=0;
const context={
  Date,
  console:{error(){errorLogs++;}},
  window:{addEventListener(type,handler){listeners.set(type,handler);}}
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ly-runtime-error-boundary.js'});

const errorHandler=listeners.get('error'),rejectionHandler=listeners.get('unhandledrejection');
assert.equal(typeof errorHandler,'function');
assert.equal(typeof rejectionHandler,'function');

let prevented=0;
errorHandler({target:context.window,message:'ResizeObserver loop completed with undelivered notifications.',preventDefault(){prevented++;}});
assert.equal(prevented,1,'benign observer noise must be suppressed');
assert.equal(errorLogs,0,'benign observer noise must not flood the console');

for(let i=0;i<10;i++)errorHandler({target:context.window,message:'renderPanel is not defined',filename:'index.html',lineno:10,colno:4});
assert.equal(errorLogs,1,'identical runtime failures must be deduplicated');
const recent=context.window.__lyRuntimeErrorBoundary.recent();
assert.equal(recent[0].count,10);
assert.equal(recent[0].message,'renderPanel is not defined');

rejectionHandler({reason:new Error('Failed to fetch'),preventDefault(){prevented++;}});
assert.equal(prevented,2,'transient network rejection must be suppressed');
assert.equal(source.includes('toastMsg'),false,'global error boundary must never show a generic toast');
assert.equal(index.includes('Phần mềm vừa tự xử lý một lỗi hiển thị.'),false,'legacy repeated error toast must be removed');
assert.ok(index.includes('ly-runtime-error-boundary.js?v=20260824.1'));
assert.ok(loader.includes("runtimeErrorBoundary:{src:'./ly-runtime-error-boundary.js?v=20260824.1'"));
assert.ok(sw.includes("'./ly-runtime-error-boundary.js'"));
console.log('Quiet, deduplicated runtime error boundary: PASS');
