import fs from 'node:fs/promises';

const APP_VERSION='2.1.61';
const REVISION='fresh-core-v2-authoritative-v62';
const LOADER_VERSION='20260825.66';
const SW_CACHE='lat-yen-fresh-core-v2-authoritative-123';
const VERSION_BADGE=`<span class="badge" id="appVersionStatic">Ver ${APP_VERSION}</span>`;
const AUTH_SHIM=`<script id="lyEarlyAuthShim">(()=>{if(typeof window.v260EnsureAuth==='function')return;window.v260EnsureAuth=async function(){try{let client=null;try{client=(typeof sb!=='undefined'&&sb)||window.sb||null;}catch(e){client=window.sb||null;}if(!client?.auth?.getSession)return false;const {data,error}=await client.auth.getSession();if(error)return false;const session=data?.session||null;window.__lyFreshSession=session;if(session&&typeof window.v260Session==='undefined')window.v260Session=session;return !!session;}catch(e){window.__lyEarlyAuthError=String(e?.message||e);return false;}};window.__lyEarlyAuthShim={version:'2026.08.24.1'};})();</script>`;
const RUNTIME_BLOCK=`
<script src="./ly-app-version.js?v=${APP_VERSION}"></script>
<script src="./ly-supabase-bootstrap.js?v=20260824.2"></script>
<script src="./ly-fresh-core-v2-legacy-hydration.js?v=20260824.4"></script>
<script src="./ly-fresh-core-v2-shadow.js?v=20260824.7"></script>
<script src="./ly-legacy-dom-shim.js?v=20260824.4"></script>
<script src="./ly-legacy-state-shim.js?v=20260824.4"></script>
<script src="./ly-legacy-helper-shim.js?v=20260824.2"></script>
<script src="./ly-legacy-model-shim.js?v=20260824.2"></script>
<script src="./ly-legacy-list-shim.js?v=20260824.1"></script>
<script src="./ly-sidebar-visuals.js?v=20260825.1"></script>
<script src="./ly-compact-admin-layout.js?v=20260825.1"></script>
<script src="./ly-menu-security.js?v=20260824.3"></script>
<script src="./ly-inapp-notifications.js?v=20260824.2"></script>
<script src="./ly-data-notifications.js?v=20260825.7"></script>
<script src="./ly-notification-center.js?v=20260823.3"></script>
<script src="./ly-inventory-alerts.js?v=20260824.1"></script>
<script src="./ly-cloud-realtime.js?v=20260824.5"></script>
<script src="./ly-fresh-core-v2-final-ownership.js?v=20260824.4"></script>
<script src="./ly-ui-bootstrap-rescue.js?v=20260824.2"></script>
<script src="./ly-independent-bootstrap.js?v=20260824.4"></script>
<script src="./ly-warehouse-delete-ux.js?v=20260824.3"></script>
<script src="./ly-local-chatbot.js?v=20260825.15"></script>
<script src="./ly-simulation-personnel.js?v=20260824.1"></script>
`;

export function prepareHtml(source){
  let html=String(source||'');
  html=html
    .replace(/<span class="badge">V274<\/span>/,VERSION_BADGE)
    .replace(/<span class="badge" id="appVersionStatic">Ver [^<]+<\/span>/,VERSION_BADGE);
  html=html.replace(
    /(<script id="lyVersionInfoInline">\(\(\)=>\{const APP_VERSION=')[^']+(',REVISION=')[^']+/,
    `$1${APP_VERSION}$2${REVISION}`
  );
  html=html.replace(/ly-module-loader\.js\?v=[^"']+/g,`ly-module-loader.js?v=${LOADER_VERSION}`);
  html=html.replace(
    "navigator.serviceWorker.register('./sw.js').catch(console.warn);",
    "navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update?.()).catch(console.warn);"
  );
  if(!html.includes('id="lyEarlyAuthShim"')){
    const tag='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
    html=html.includes(tag)?html.replace(tag,tag+'\n'+AUTH_SHIM):html.replace(/<head>/i,'<head>\n'+AUTH_SHIM);
  }
  html=html.replace(/\n?<script src="\.\/ly-(?:local-chatbot|simulation-personnel)\.js\?v=[^"]+"><\/script>/g,'');
  html=html.replace(
    /\n*(?:<script src="\.\/ly-runtime-error-boundary\.js\?v=[^"]+"><\/script>\n)?<script src="\.\/ly-app-version\.js\?v=[^"]+"><\/script>[\s\S]*?<script src="\.\/ly-warehouse-delete-ux\.js\?v=[^"]+"><\/script>\n*/g,
    '\n'
  );
  return /<\/body>/i.test(html)?html.replace(/<\/body>/i,RUNTIME_BLOCK+'\n</body>'):html+RUNTIME_BLOCK;
}

function prepareSw(source){
  let sw=String(source||'');
  sw=sw.replace(/const CACHE='[^']+';/,`const CACHE='${SW_CACHE}';`);
  if(!sw.includes("'./ly-supabase-bootstrap.js'"))sw=sw.replace("INDEX_KEY,'./manifest.webmanifest','./icon.svg','./ly-module-loader.js','./ly-app-version.js',","INDEX_KEY,'./manifest.webmanifest','./icon.svg','./ly-module-loader.js','./ly-app-version.js','./ly-supabase-bootstrap.js',");
  if(!sw.includes("'./ly-runtime-error-boundary.js'"))sw=sw.replace("INDEX_KEY,'./manifest.webmanifest','./icon.svg',","INDEX_KEY,'./manifest.webmanifest','./icon.svg','./ly-runtime-error-boundary.js',");
  if(!sw.includes("'./ly-legacy-dom-shim.js'"))sw=sw.replace("'./ly-fresh-core-v2-final-ownership.js',","'./ly-fresh-core-v2-final-ownership.js','./ly-legacy-dom-shim.js',");
  if(!sw.includes("'./ly-legacy-state-shim.js'"))sw=sw.replace("'./ly-legacy-dom-shim.js',","'./ly-legacy-dom-shim.js','./ly-legacy-state-shim.js',");
  if(!sw.includes("'./ly-legacy-helper-shim.js'"))sw=sw.replace("'./ly-legacy-state-shim.js',","'./ly-legacy-state-shim.js','./ly-legacy-helper-shim.js',");
  if(!sw.includes("'./ly-legacy-model-shim.js'"))sw=sw.replace("'./ly-legacy-helper-shim.js',","'./ly-legacy-helper-shim.js','./ly-legacy-model-shim.js',");
  if(!sw.includes("'./ly-legacy-list-shim.js'"))sw=sw.replace("'./ly-legacy-model-shim.js',","'./ly-legacy-model-shim.js','./ly-legacy-list-shim.js',");
  if(!sw.includes("'./ly-menu-security.js'"))sw=sw.replace("'./ly-legacy-list-shim.js',","'./ly-legacy-list-shim.js','./ly-menu-security.js',");
  if(!sw.includes("'./ly-local-chatbot.js'"))sw=sw.replace("'./ly-warehouse-delete-ux.js',","'./ly-warehouse-delete-ux.js','./ly-local-chatbot.js',");
  if(!sw.includes("'./ly-inventory-alerts.js'"))sw=sw.replace("'./ly-notification-center.js',","'./ly-notification-center.js','./ly-inventory-alerts.js',");
  return sw;
}

const input=await fs.readFile('index.html','utf8');
const output=prepareHtml(input);
const swInput=await fs.readFile('sw.js','utf8');
const swOutput=prepareSw(swInput);
const checks=[
  ['version',output.includes(`ly-app-version.js?v=${APP_VERSION}`)],
  ['loader',output.includes(`ly-module-loader.js?v=${LOADER_VERSION}`)],
  ['runtime error boundary',output.includes('ly-runtime-error-boundary.js?v=20260824.1')],
  ['state shim',output.includes('ly-legacy-state-shim.js?v=20260824.4')],
  ['helper shim v2',output.includes('ly-legacy-helper-shim.js?v=20260824.2')],
  ['model shim',output.includes('ly-legacy-model-shim.js?v=20260824.2')],
  ['list shim',output.includes('ly-legacy-list-shim.js?v=20260824.1')],
  ['menu security',output.includes('ly-menu-security.js?v=20260824.3')],
  ['list before security',output.indexOf('ly-legacy-list-shim.js?v=20260824.1')<output.indexOf('ly-menu-security.js?v=20260824.3')],
  ['security before final',output.indexOf('ly-menu-security.js?v=20260824.3')<output.indexOf('ly-fresh-core-v2-final-ownership.js?v=20260824.4')],
  ['in-app notifications',output.includes('ly-inapp-notifications.js?v=20260824.2')],
  ['data notifications',output.includes('ly-data-notifications.js?v=20260825.7')],
  ['notification center',output.includes('ly-notification-center.js?v=20260823.3')],
  ['inventory alerts',output.includes('ly-inventory-alerts.js?v=20260824.1')],
  ['unified cloud realtime',output.includes('ly-cloud-realtime.js?v=20260824.5')],
  ['stable bootstrap',output.includes('ly-independent-bootstrap.js?v=20260824.4')],
  ['local assistant',output.includes('ly-local-chatbot.js?v=20260825.15')],
  ['single auth owner',!output.includes('ly-auth-gate.js')],
  ['single Supabase client bootstrap',output.includes('ly-supabase-bootstrap.js?v=20260824.2')],
  ['shadow',output.includes('ly-fresh-core-v2-shadow.js?v=20260824.7')],
  ['core85',swOutput.includes(SW_CACHE)]
];
for(const [name,ok]of checks)if(!ok)throw new Error(`Pages artifact check failed: ${name}`);

if(process.argv.includes('--check')){
  console.log(`Pages artifact contract: PASS (Ver ${APP_VERSION})`);
}else{
  await fs.writeFile('index.html',output,'utf8');
  await fs.writeFile('sw.js',swOutput,'utf8');
  console.log(`Prepared GitHub Pages artifact for Ver ${APP_VERSION}`);
}
