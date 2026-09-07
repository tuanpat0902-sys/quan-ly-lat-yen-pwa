import fs from 'node:fs/promises';

const RELEASE=JSON.parse(await fs.readFile('release-config.json','utf8'));
const APP_VERSION=RELEASE.appVersion;
const REVISION=RELEASE.revision;
const LOADER_VERSION=RELEASE.loaderAssetVersion;
const SIDEBAR_VERSION=RELEASE.sidebarVisualsAssetVersion;
const SW_CACHE=RELEASE.serviceWorker;
const VIBE_URL='https://quan-ly-lat-yen-pwa-live.n1.tinhgon.xyz/';
const REDIRECT_HTML=`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${VIBE_URL}"><title>Đang chuyển sang Quản Lý Lát Yên</title><link rel="canonical" href="${VIBE_URL}"><script>location.replace('${VIBE_URL}')</script></head><body><p>Đang chuyển sang <a href="${VIBE_URL}">Quản Lý Lát Yên trên Vibe Host</a>…</p></body></html>`;
const REDIRECT_SW=`const TARGET='${VIBE_URL}';self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))try{await client.navigate(TARGET)}catch{}})()));self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(Response.redirect(TARGET,302))});`;
const VERSION_BADGE=`<span class="badge" id="appVersionStatic">Ver ${APP_VERSION}</span>`;
const RELEASE_GATE=`<script id="lyReleaseGate">(()=>{const EXPECTED_VERSION='${APP_VERSION}',EXPECTED_REVISION='${REVISION}',KEY='lat_yen_release_gate_'+EXPECTED_VERSION;let recovering=false;const releaseToken=EXPECTED_VERSION+'-'+EXPECTED_REVISION;function replaceUrl(extra){const url=new URL(location.href);url.searchParams.set('ly_release',releaseToken);if(extra)url.searchParams.set('ly_recovery',String(extra));location.replace(url.href);}async function clearRuntime(){try{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('lat-yen-')).map(k=>caches.delete(k)));}catch(e){}}async function recover(reason){if(recovering)return;recovering=true;let attempts=0;try{attempts=Number(sessionStorage.getItem(KEY)||0)+1;sessionStorage.setItem(KEY,String(attempts));}catch(e){}await clearRuntime();try{const regs=await navigator.serviceWorker?.getRegistrations?.()||[];for(const reg of regs){try{await reg.update?.();}catch(e){}if(attempts>=2){try{await reg.unregister?.();}catch(e){}}}}catch(e){}replaceUrl(reason+'-'+attempts);}function verify(){const current=window.__lyAppVersion||{};if(current.version&&current.version!==EXPECTED_VERSION)return recover('version');if(current.revision&&current.revision!==EXPECTED_REVISION)return recover('revision');}if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('controllerchange',()=>{let done=false;try{done=sessionStorage.getItem(KEY+'_controller')===releaseToken;if(!done)sessionStorage.setItem(KEY+'_controller',releaseToken);}catch(e){}if(!done)replaceUrl('controller');});navigator.serviceWorker.getRegistration?.().then(reg=>reg?.update?.()).catch(()=>{});}window.__lyExpectedRelease={version:EXPECTED_VERSION,revision:EXPECTED_REVISION,verify,recover};[500,1200,2500,5000].forEach(ms=>setTimeout(verify,ms));})();</script>`;
const AUTH_SHIM=`<script id="lyEarlyAuthShim">(()=>{if(typeof window.v260EnsureAuth==='function')return;window.v260EnsureAuth=async function(){try{const response=await fetch('/api/auth/session',{cache:'no-store'});if(!response.ok)return false;const data=await response.json();const session=data?.session||null;window.__lyFreshSession=session;window.__lyFreshOrgId=session?.org_id||null;if(session&&typeof window.v260Session==='undefined')window.v260Session=session;return !!session;}catch(e){window.__lyEarlyAuthError=String(e?.message||e);return false;}};window.__lyEarlyAuthShim={version:'2026.09.07.2',provider:'vibe'};})();</script>`;
const RUNTIME_BLOCK=`
<script src="./ly-sidebar-visuals.js?v=${SIDEBAR_VERSION}"></script>
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
  if(!html.includes('id="lyReleaseGate"'))html=html.replace(/<head>/i,'<head>\n'+RELEASE_GATE);
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
  return String(source||'').replace(/const CACHE='[^']+';/,`const CACHE='${SW_CACHE}';`);
}

const input=await fs.readFile('index.html','utf8');
const output=prepareHtml(input);
const swInput=await fs.readFile('sw.js','utf8');
const swOutput=prepareSw(swInput);
const checks=[
  ['loader',output.includes(`ly-module-loader.js?v=${LOADER_VERSION}`)],
  ['sidebar visuals',output.includes(`ly-sidebar-visuals.js?v=${SIDEBAR_VERSION}`)],
  ['release gate',output.includes('id="lyReleaseGate"')&&output.includes(`EXPECTED_VERSION='${APP_VERSION}'`)&&output.includes(`EXPECTED_REVISION='${REVISION}'`)],
  ['single app-version owner',!RUNTIME_BLOCK.includes('ly-app-version.js')],
  ['no duplicated module-owned bootstrap',!/(ly-supabase-bootstrap|ly-fresh-core-v2-|ly-legacy-|ly-menu-security|ly-inapp-notifications|ly-data-notifications|ly-notification-center|ly-cloud-realtime|ly-warehouse-delete-ux|ly-local-chatbot|ly-chat-language-plus|ly-chat-local-only)/.test(RUNTIME_BLOCK)],
  ['stable bootstrap',output.includes('ly-independent-bootstrap.js?v=20260824.4')],
  ['single auth owner',!output.includes('ly-auth-gate.js')],
  ['service worker cache',swOutput.includes(SW_CACHE)],
  ['bounded critical precache',swOutput.includes("const PRECACHE_ASSETS=[")&&!swOutput.includes('CORE_ASSETS')],
  ['redirect-only Pages HTML',REDIRECT_HTML.includes('http-equiv="refresh"')&&REDIRECT_HTML.includes(VIBE_URL)&&!REDIRECT_HTML.includes('supabase')],
  ['redirect-only Pages worker',REDIRECT_SW.includes('Response.redirect(TARGET,302)')&&REDIRECT_SW.includes('client.navigate(TARGET)')],
];
for(const [name,ok]of checks)if(!ok)throw new Error(`Pages artifact check failed: ${name}`);

if(process.argv.includes('--check')){
  console.log(`Pages artifact contract: PASS (Ver ${APP_VERSION})`);
}else{
  await fs.writeFile('index.html',REDIRECT_HTML,'utf8');
  await fs.writeFile('sw.js',REDIRECT_SW,'utf8');
  console.log(`Prepared redirect-only GitHub Pages artifact for Ver ${APP_VERSION}`);
}
