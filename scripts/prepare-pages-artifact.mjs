import fs from 'node:fs/promises';

const APP_VERSION='2.1.2';
const VERSION_BADGE=`<span class="badge" id="appVersionStatic">Ver ${APP_VERSION}</span>`;
const RUNTIME_BLOCK=`\n<script src="./ly-app-version.js?v=${APP_VERSION}"></script>\n<script src="./ly-fresh-core-v2-final-ownership.js?v=20260824.2"></script>\n<script src="./ly-warehouse-delete-ux.js?v=20260824.1"></script>\n`;

export function prepareHtml(source){
  let html=String(source||'');
  html=html.replace(/<span class="badge">V274<\/span>/,VERSION_BADGE);
  html=html.replace(/<span class="badge" id="appVersionStatic">Ver [^<]+<\/span>/,VERSION_BADGE);
  html=html.replace(
    "navigator.serviceWorker.register('./sw.js').catch(console.warn);",
    "navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update?.()).catch(console.warn);"
  );
  if(!html.includes('ly-fresh-core-v2-final-ownership.js?v=20260824.2')){
    html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,RUNTIME_BLOCK+'\n</body>'):html+RUNTIME_BLOCK;
  }
  return html;
}

function prepareSw(source){
  let sw=String(source||'');
  sw=sw.replace(/lat-yen-(?:legacy-ui-fresh-core|fresh-core-v2-authoritative)-\d+/g,'lat-yen-fresh-core-v2-authoritative-55');
  sw=sw.replace(/ly-module-loader\.js\?v=[^'\"]+/g,'ly-module-loader.js?v=20260824.6');
  sw=sw.replace(/ly-app-version\.js\?v=[^'\"]+/g,'ly-app-version.js?v=2.1.2');
  if(!sw.includes("const V2_FINAL_OWNERSHIP_SCRIPT='./ly-fresh-core-v2-final-ownership.js'")){
    sw=sw.replace("const V2_REALTIME_PHASE2_SCRIPT='./ly-fresh-core-v2-realtime-phase2.js';","const V2_REALTIME_PHASE2_SCRIPT='./ly-fresh-core-v2-realtime-phase2.js';\nconst V2_FINAL_OWNERSHIP_SCRIPT='./ly-fresh-core-v2-final-ownership.js';");
    sw=sw.replace('V2_REALTIME_PHASE2_SCRIPT,...V2_ASSETS','V2_REALTIME_PHASE2_SCRIPT,V2_FINAL_OWNERSHIP_SCRIPT,...V2_ASSETS');
  }
  if(!sw.includes("ly-fresh-core-v2-final-ownership.js?v=20260824.2")){
    sw=sw.replace("if(scripts.length){const block=scripts.join('\\n');","if(!html.includes('ly-fresh-core-v2-final-ownership.js'))scripts.push('<script src=\"./ly-fresh-core-v2-final-ownership.js?v=20260824.2\"></script>');if(scripts.length){const block=scripts.join('\\n');");
  }
  return sw;
}

const input=await fs.readFile('index.html','utf8');
const output=prepareHtml(input);
const swInput=await fs.readFile('sw.js','utf8');
const swOutput=prepareSw(swInput);
const checks=[
  ['static version badge',output.includes(`id="appVersionStatic">Ver ${APP_VERSION}`)],
  ['no V274 badge',!output.includes('<span class="badge">V274</span>')],
  ['SW bypasses HTTP cache',output.includes("updateViaCache:'none'")],
  ['version runtime injected',output.includes(`ly-app-version.js?v=${APP_VERSION}`)],
  ['final V2 ownership injected',output.includes('ly-fresh-core-v2-final-ownership.js?v=20260824.2')],
  ['warehouse UX injected',output.includes('ly-warehouse-delete-ux.js?v=20260824.1')],
  ['authoritative SW cache',swOutput.includes('lat-yen-fresh-core-v2-authoritative-55')],
  ['final V2 ownership cached',swOutput.includes('V2_FINAL_OWNERSHIP_SCRIPT')]
];
for(const [name,ok] of checks){if(!ok)throw new Error(`Pages artifact check failed: ${name}`);}
if(process.argv.includes('--check')){
  console.log(`Pages artifact contract: PASS (Ver ${APP_VERSION} · Fresh Core V2 authoritative)`);
}else{
  await fs.writeFile('index.html',output,'utf8');
  await fs.writeFile('sw.js',swOutput,'utf8');
  console.log(`Prepared GitHub Pages artifact for Ver ${APP_VERSION} · Fresh Core V2 authoritative`);
}
