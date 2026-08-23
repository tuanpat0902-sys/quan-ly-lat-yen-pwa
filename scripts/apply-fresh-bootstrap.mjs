import fs from 'node:fs';
const file='index.html';
let html=fs.readFileSync(file,'utf8');
const marker='<script>\n// ===== SUPABASE PROJECT =====';
if(!html.includes(marker))throw new Error('Legacy main script marker not found');
const block=`<!-- Lát Yên fresh-install bootstrap V1: lightweight loader + bridges only -->\n<script src="./ly-module-loader.js?v=20260823.8"></script>\n<script src="./ly-history-bridge.js?v=20260823.1"></script>\n<script src="./ly-employees-bridge.js?v=20260823.1"></script>\n<script src="./ly-finance-bridge.js?v=20260823.1"></script>\n<script src="./ly-reports-bridge.js?v=20260823.1"></script>\n<script src="./ly-settings-ui-bridge.js?v=20260823.1"></script>\n<script src="./ly-cashflow-bridge.js?v=20260823.1"></script>\n<script src="./ly-special-reports-bridge.js?v=20260823.1"></script>\n<script src="./ly-employee-reports-bridge.js?v=20260823.1"></script>\n`;
if(html.includes('Lát Yên fresh-install bootstrap V1')){
  console.log('Fresh bootstrap already installed');
  process.exit(0);
}
html=html.replace(marker,block+marker);
fs.writeFileSync(file,html);
console.log('Fresh-install bootstrap inserted before Legacy main script');
