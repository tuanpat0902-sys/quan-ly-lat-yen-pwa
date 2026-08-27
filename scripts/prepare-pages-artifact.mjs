import fs from 'node:fs/promises';

const RELEASE=JSON.parse(await fs.readFile('release-config.json','utf8'));
const APP_VERSION=RELEASE.appVersion;
const REVISION=RELEASE.revision;
const LOADER_VERSION=RELEASE.loaderAssetVersion;
const SW_CACHE=RELEASE.serviceWorker;
const VERSION_BADGE=`<span class="badge" id="appVersionStatic">Ver ${APP_VERSION}</span>`;
const AUTH_SHIM=`<script id="lyEarlyAuthShim">(()=>{if(typeof window.v260EnsureAuth==='function')return;window.v260EnsureAuth=async function(){try{let client=null;try{client=(typeof sb!=='undefined'&&sb)||window.sb||null;}catch(e){client=window.sb||null;}if(!client?.auth?.getSession)return false;const {data,error}=await client.auth.getSession();if(error)return false;const session=data?.session||null;window.__lyFreshSession=session;if(session&&typeof window.v260Session==='undefined')window.v260Session=session;return !!session;}catch(e){window.__lyEarlyAuthError=String(e?.message||e);return false;}};window.__lyEarlyAuthShim={version:'2026.08.24.1'};})();</script>`;
const RUNTIME_BLOCK=`
<script src="./ly-sidebar-visuals.js?v=20260825.1"></script>
<script src="./ly-compact-admin-layout.js?v=20260825.4"></script>
<script src="./ly-ui-bootstrap-rescue.js?v=20260824.2"></script>
<script src="./ly-independent-bootstrap.js?v=20260824.4"></script>
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
  html=html.replace(/\n?<script src="\.\/ly-(?:local-chatbot|chat-language-plus|chat-local-only|simulation-personnel)\.js\?v=[^"]+"><\/script>/g,'');
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
  if(!sw.includes("'./ly-chat-language-plus.js'"))sw=sw.replace("'./ly-local-chatbot.js',","'./ly-local-chatbot.js','./ly-chat-language-plus.js',");
  if(!sw.includes("'./ly-chat-inventory-query.js'"))sw=sw.replace("'./ly-chat-language-plus.js',","'./ly-chat-language-plus.js','./ly-chat-inventory-query.js',");
  if(!sw.includes("'./ly-chat-sales-query.js'"))sw=sw.replace("'./ly-chat-inventory-query.js',","'./ly-chat-inventory-query.js','./ly-chat-sales-query.js',");
  if(!sw.includes("'./ly-chat-sales-insights.js'"))sw=sw.replace("'./ly-chat-sales-query.js',","'./ly-chat-sales-query.js','./ly-chat-sales-insights.js',");
  if(!sw.includes("'./ly-chat-router.js'"))sw=sw.replace("'./ly-chat-sales-insights.js',","'./ly-chat-sales-insights.js','./ly-chat-router.js',");
  if(!sw.includes("'./ly-chat-legacy-inventory-unit-guard.js'"))sw=sw.replace("'./ly-chat-router.js',","'./ly-chat-router.js','./ly-chat-legacy-inventory-unit-guard.js',");
  if(!sw.includes("'./ly-chat-response-gate.js'"))sw=sw.replace("'./ly-chat-legacy-inventory-unit-guard.js',","'./ly-chat-legacy-inventory-unit-guard.js','./ly-chat-response-gate.js',");
  if(!sw.includes("'./ly-chat-local-only.js'"))sw=sw.replace("'./ly-chat-response-gate.js',","'./ly-chat-response-gate.js','./ly-chat-local-only.js',");
  if(!sw.includes("'./ly-sales-report-revenue-card.js'"))sw=sw.replace("'./ly-special-reports.js',","'./ly-special-reports.js','./ly-sales-report-revenue-card.js',");
  if(!sw.includes("'./ly-inventory-alerts.js'"))sw=sw.replace("'./ly-notification-center.js',","'./ly-notification-center.js','./ly-inventory-alerts.js',");
  return sw;
}

const input=await fs.readFile('index.html','utf8');
const output=prepareHtml(input);
const swInput=await fs.readFile('sw.js','utf8');
const swOutput=prepareSw(swInput);
const checks=[
  ['loader',output.includes(`ly-module-loader.js?v=${LOADER_VERSION}`)],
  ['single app-version owner',!RUNTIME_BLOCK.includes('ly-app-version.js')],
  ['no duplicated module-owned bootstrap',!/(ly-supabase-bootstrap|ly-fresh-core-v2-|ly-legacy-|ly-menu-security|ly-inapp-notifications|ly-data-notifications|ly-notification-center|ly-cloud-realtime|ly-warehouse-delete-ux|ly-local-chatbot|ly-chat-language-plus|ly-chat-local-only)/.test(RUNTIME_BLOCK)],
  ['stable bootstrap',output.includes('ly-independent-bootstrap.js?v=20260824.4')],
  ['single auth owner',!output.includes('ly-auth-gate.js')],
  ['service worker cache',swOutput.includes(SW_CACHE)],
  ['service worker language plus',swOutput.includes("'./ly-chat-language-plus.js'")],
  ['service worker inventory query',swOutput.includes("'./ly-chat-inventory-query.js'")],
  ['service worker sales query',swOutput.includes("'./ly-chat-sales-query.js'")],
  ['service worker sales insights',swOutput.includes("'./ly-chat-sales-insights.js'")],
  ['service worker chat router',swOutput.includes("'./ly-chat-router.js'")],
  ['service worker legacy inventory unit guard',swOutput.includes("'./ly-chat-legacy-inventory-unit-guard.js'")],
  ['service worker chat response gate',swOutput.includes("'./ly-chat-response-gate.js'")],
  ['service worker sales revenue card',swOutput.includes("'./ly-sales-report-revenue-card.js'")],
  ['service worker local-only gate',swOutput.includes("'./ly-chat-local-only.js'")]
];
for(const [name,ok]of checks)if(!ok)throw new Error(`Pages artifact check failed: ${name}`);

if(process.argv.includes('--check')){
  console.log(`Pages artifact contract: PASS (Ver ${APP_VERSION})`);
}else{
  await fs.writeFile('index.html',output,'utf8');
  await fs.writeFile('sw.js',swOutput,'utf8');
  console.log(`Prepared GitHub Pages artifact for Ver ${APP_VERSION}`);
}
