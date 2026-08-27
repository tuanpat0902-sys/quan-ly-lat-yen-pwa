import fs from 'node:fs/promises';
import path from 'node:path';
import {isProductionRootRuntime,UNUSED_ROOT_RUNTIME_FILES} from './runtime-assets.mjs';

const out=process.argv[2]||'_site';
await fs.mkdir(out,{recursive:true});
const entries=await fs.readdir('.', {withFileTypes:true});
const runtime=entries.filter(e=>e.isFile()&&isProductionRootRuntime(e.name)).map(e=>e.name).sort();
await Promise.all(runtime.map(file=>fs.copyFile(file,path.join(out,file))));
console.log(`Copied ${runtime.length} production runtime modules; excluded ${UNUSED_ROOT_RUNTIME_FILES.size} legacy experiment files.`);

async function copyV3Runtime(src='src-v3',dest=path.join(out,'src-v3')){
  const entries=await fs.readdir(src,{withFileTypes:true});
  await fs.mkdir(dest,{recursive:true});
  for(const entry of entries){
    const from=path.join(src,entry.name),to=path.join(dest,entry.name);
    if(entry.isDirectory())await copyV3Runtime(from,to);
    else if(entry.isFile()&&entry.name.endsWith('.js'))await fs.copyFile(from,to);
  }
}
await copyV3Runtime();
console.log('Copied Fresh Core V3 shadow runtime modules.');
