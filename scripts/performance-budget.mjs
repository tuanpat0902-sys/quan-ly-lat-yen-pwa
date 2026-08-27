import fs from 'node:fs';
import {UNUSED_ROOT_RUNTIME_FILES} from './runtime-assets.mjs';

const read=file=>fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const index=read('index.html');
const loader=read('ly-module-loader.js');
const perf=read('ly-performance-optimizer.js');
const sw=read('sw.js');

const rootFiles=fs.readdirSync('.').filter(f=>/^ly-.*\.js$/.test(f)&&!UNUSED_ROOT_RUNTIME_FILES.has(f));
const moduleMap=new Map();
for(const match of loader.matchAll(/(\w+):\{src:'\.\/([^'?]+)(?:\?[^']*)?'/g))moduleMap.set(match[1],match[2]);

const eagerNames=new Set(['runtimeErrorBoundary','appVersion','warehouseDeleteUX']);
const coreBody=loader.match(/async function loadCore\(\)\{([\s\S]*?)\n  \}/)?.[1]||'';
for(const match of coreBody.matchAll(/load\('([^']+)'\)/g))eagerNames.add(match[1]);
const staticFiles=new Set([...index.matchAll(/<script\b[^>]*src=["']\.\/([^"'?]+)(?:\?[^"']*)?["'][^>]*><\/script>/gi)].map(m=>m[1]));
const eagerFiles=new Set([...eagerNames].map(name=>moduleMap.get(name)).filter(Boolean));
for(const file of staticFiles)if(/^ly-.*\.js$/.test(file))eagerFiles.add(file);

const counts=source=>({
  intervals:(source.match(/setInterval\s*\(/g)||[]).length,
  observers:(source.match(/new\s+MutationObserver\s*\(/g)||[]).length,
  innerHtml:(source.match(/\.innerHTML\s*=/g)||[]).length
});
const eagerSource=[index,...[...eagerFiles].filter(f=>fs.existsSync(f)).map(read)].join('\n');
const fullSource=[index,...rootFiles.map(read)].join('\n');
const eager=counts(eagerSource),full=counts(fullSource);
const indexBytes=Buffer.byteLength(index);
const coreNumber=Number(sw.match(/(?:fresh-core|authoritative)-v?(\d+)/)?.[1]||sw.match(/(?:fresh-core|authoritative)-(\d+)/)?.[1]||0);

let failed=false;
const fail=m=>{failed=true;console.error('FAIL:',m)};
const pass=m=>console.log('PASS:',m);

console.log(`INFO: index=${indexBytes} bytes eagerFiles=${eagerFiles.size} eagerIntervals=${eager.intervals} eagerObservers=${eager.observers} eagerInnerHTML=${eager.innerHtml} fullIntervals=${full.intervals} fullObservers=${full.observers} fullInnerHTML=${full.innerHtml} core=${coreNumber}`);

if(indexBytes>1_320_000)fail('index.html exceeded 1.32 MB performance budget');else pass('index.html performance budget');
if(eager.intervals>8)fail(`eager setInterval call sites above budget: ${eager.intervals}`);else pass('eager timer budget');
if(eager.observers>7)fail(`eager MutationObserver call sites above budget: ${eager.observers}`);else pass('eager observer budget');
if(full.intervals>18)fail(`repository timer call sites regressed above ceiling: ${full.intervals}`);else pass('repository timer regression ceiling');
if(full.observers>11)fail(`repository observer call sites regressed above ceiling: ${full.observers}`);else pass('repository observer regression ceiling');
if(full.innerHtml>175)fail(`DOM assignment call sites regressed above ceiling: ${full.innerHtml}`);else pass('DOM assignment regression ceiling');
for(const marker of ['__lyPerformanceOptimizerV4','LEADER_VISIBLE_MS=4500','rebindTableObserver','tableMutationBatch'])if(!perf.includes(marker))fail(`Performance V4 marker missing: ${marker}`);
if(coreNumber<38)fail(`Service Worker is below Core-38 performance baseline: ${coreNumber}`);else pass(`Core-${coreNumber} cache baseline`);
if(!loader.includes("performanceOptimizer:{src:'./ly-performance-optimizer.js?v=20260823.4'"))fail('Performance V4 is not owned by the module loader');
else if(!coreBody.includes("load('performanceOptimizer')"))fail('Performance V4 is not loaded with the core runtime');
else pass('Performance V4 module-loader wiring');
if(/setInterval\s*\(\s*schedule\s*,\s*700/.test(fullSource))fail('700ms cloud render interval regression detected');

if(failed){console.error('\nPerformance budget failed. Deployment must stop.');process.exit(1)}
console.log('\nPerformance budget passed.');
