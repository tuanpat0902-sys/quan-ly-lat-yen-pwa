import fs from 'node:fs';
const indexFile='index.html';
let html=fs.readFileSync(indexFile,'utf8');
const marker='<script>\n// ===== SUPABASE PROJECT =====';
if(!html.includes(marker))throw new Error('Legacy main script marker not found');
const block=`<!-- Lát Yên fresh-install bootstrap V1: lightweight loader + bridges only -->\n<script src="./ly-module-loader.js?v=20260823.8"></script>\n<script src="./ly-history-bridge.js?v=20260823.1"></script>\n<script src="./ly-employees-bridge.js?v=20260823.1"></script>\n<script src="./ly-finance-bridge.js?v=20260823.1"></script>\n<script src="./ly-reports-bridge.js?v=20260823.1"></script>\n<script src="./ly-settings-ui-bridge.js?v=20260823.1"></script>\n<script src="./ly-cashflow-bridge.js?v=20260823.1"></script>\n<script src="./ly-special-reports-bridge.js?v=20260823.1"></script>\n<script src="./ly-employee-reports-bridge.js?v=20260823.1"></script>\n`;
if(!html.includes('Lát Yên fresh-install bootstrap V1')){
  html=html.replace(marker,block+marker);
  fs.writeFileSync(indexFile,html);
  console.log('Fresh-install bootstrap inserted before Legacy main script');
}else console.log('Fresh bootstrap already installed');

const swFile='sw.js';
let sw=fs.readFileSync(swFile,'utf8');
if(sw.includes("lat-yen-legacy-ui-fresh-core-35")){
  sw=sw.replace("lat-yen-legacy-ui-fresh-core-35","lat-yen-legacy-ui-fresh-core-36");
  fs.writeFileSync(swFile,sw);
  console.log('Service Worker cache bumped to Core-36');
}else if(sw.includes("lat-yen-legacy-ui-fresh-core-36"))console.log('Core-36 already set');
else throw new Error('Unexpected Service Worker cache version');
