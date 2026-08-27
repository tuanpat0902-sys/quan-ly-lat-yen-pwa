import fs from 'node:fs/promises';
import path from 'node:path';
import {isProductionRootRuntime,UNUSED_ROOT_RUNTIME_FILES} from './runtime-assets.mjs';

const out=process.argv[2]||'_site';
await fs.mkdir(out,{recursive:true});
const entries=await fs.readdir('.', {withFileTypes:true});
const runtime=entries.filter(e=>e.isFile()&&isProductionRootRuntime(e.name)).map(e=>e.name).sort();
await Promise.all(runtime.map(file=>fs.copyFile(file,path.join(out,file))));
console.log(`Copied ${runtime.length} production runtime modules; excluded ${UNUSED_ROOT_RUNTIME_FILES.size} legacy experiment files.`);
