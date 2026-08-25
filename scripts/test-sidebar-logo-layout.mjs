import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const block=fs.readFileSync(new URL('../ly-sidebar-visuals.js',import.meta.url),'utf8');
for(const expected of ['header .brand-wrap','header .app-logo-slot img','width:100%!important','max-width:none!important','height:auto!important','object-fit:contain!important']){
  if(!block.includes(expected))throw new Error(`Missing full-width logo contract: ${expected}`);
}
if(block.indexOf('header .app-logo-slot img')>block.indexOf('@media(min-width:761px)'))throw new Error('Full-width logo must also apply on narrow sidebars');
if(!block.includes("version:'2026.08.25.1'"))throw new Error('Sidebar visuals version is stale');
if(!/appNameText[\s\S]*text-align:center!important/.test(block))throw new Error('Software name must be centered beneath the logo');
if(!block.includes('background:#0f766e!important')||!block.includes('color:#fff!important'))throw new Error('Active menu palette is incomplete');
if(!html.includes('ly-sidebar-visuals.js?v=20260825.1'))throw new Error('Sidebar visuals are not loaded');
console.log('Sidebar full-width logo layout: PASS');
