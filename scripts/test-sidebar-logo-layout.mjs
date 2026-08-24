import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const block=fs.readFileSync(new URL('../ly-sidebar-visuals.js',import.meta.url),'utf8');
for(const expected of ['@media(min-width:761px)','header .app-logo-slot img','width:100%!important','height:auto!important','object-fit:contain!important']){
  if(!block.includes(expected))throw new Error(`Missing full-width logo contract: ${expected}`);
}
if(!html.includes('ly-sidebar-visuals.js?v=20260824.1'))throw new Error('Sidebar visuals are not loaded');
console.log('Sidebar full-width logo layout: PASS');
