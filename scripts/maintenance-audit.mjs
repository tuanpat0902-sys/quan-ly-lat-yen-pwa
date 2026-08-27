import fs from 'node:fs/promises';
import {UNUSED_ROOT_RUNTIME_FILES} from './runtime-assets.mjs';

const [sw,loader,index]=await Promise.all([
  fs.readFile('sw.js','utf8'),
  fs.readFile('ly-module-loader.js','utf8'),
  fs.readFile('index.html','utf8')
]);
const productionSource=`${sw}\n${loader}\n${index}`;
const failures=[];
for(const file of UNUSED_ROOT_RUNTIME_FILES){
  if(productionSource.includes(file))failures.push(`unused experiment still wired into production: ${file}`);
}
const precacheMatch=sw.match(/const PRECACHE_ASSETS=CORE_ASSETS\.filter[\s\S]*?\.includes\(url\)\);/);
if(!precacheMatch)failures.push('service worker must keep a bounded PRECACHE_ASSETS subset');
const critical=(precacheMatch?.[0].match(/\.\/[A-Za-z0-9_.?/-]+/g)||[]).length;
if(critical>12)failures.push(`service worker critical precache grew too large: ${critical}`);
if(!sw.includes("cacheFirstStatic(request)"))failures.push('static assets must use cache-first path');
if(!sw.includes("ignoreSearch:true"))failures.push('versioned static requests must reuse same-release cached assets');
if(failures.length){
  console.error('Maintenance audit: FAIL');
  for(const failure of failures)console.error('- '+failure);
  process.exit(1);
}
console.log(`Maintenance audit: PASS (critical precache entries: ${critical}, production experiments excluded: ${UNUSED_ROOT_RUNTIME_FILES.size})`);
