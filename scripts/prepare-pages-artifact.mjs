import fs from 'node:fs/promises';

const APP_VERSION='2.0.4';
const VERSION_BADGE=`<span class="badge" id="appVersionStatic">Ver ${APP_VERSION}</span>`;
const HOTFIX_BLOCK=`\n<script src="./ly-app-version.js?v=${APP_VERSION}"></script>\n<script src="./ly-warehouse-delete-ux.js?v=20260824.1"></script>\n`;

export function prepareHtml(source){
  let html=String(source||'');
  html=html.replace(/<span class="badge">V274<\/span>/,VERSION_BADGE);
  html=html.replace(
    "navigator.serviceWorker.register('./sw.js').catch(console.warn);",
    "navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update?.()).catch(console.warn);"
  );
  if(!html.includes('ly-app-version.js?v=2.0.4')){
    html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,HOTFIX_BLOCK+'\n</body>'):html+HOTFIX_BLOCK;
  }
  return html;
}

const input=await fs.readFile('index.html','utf8');
const output=prepareHtml(input);
const checks=[
  ['static version badge',output.includes(`id="appVersionStatic">Ver ${APP_VERSION}`)],
  ['no V274 badge',!output.includes('<span class="badge">V274</span>')],
  ['SW bypasses HTTP cache',output.includes("updateViaCache:'none'")],
  ['version runtime injected',output.includes(`ly-app-version.js?v=${APP_VERSION}`)],
  ['warehouse UX injected',output.includes('ly-warehouse-delete-ux.js?v=20260824.1')]
];
for(const [name,ok] of checks){if(!ok)throw new Error(`Pages artifact check failed: ${name}`);}
if(process.argv.includes('--check')){
  console.log(`Pages artifact contract: PASS (Ver ${APP_VERSION})`);
}else{
  await fs.writeFile('index.html',output,'utf8');
  console.log(`Prepared GitHub Pages artifact for Ver ${APP_VERSION}`);
}
