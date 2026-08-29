import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const block=fs.readFileSync(new URL('../ly-sidebar-visuals.js',import.meta.url),'utf8');
const pages=fs.readFileSync(new URL('./prepare-pages-artifact.mjs',import.meta.url),'utf8');
for(const expected of ['header .brand-wrap','header .app-logo-slot img','width:100%!important','max-width:none!important','height:auto!important','object-fit:contain!important']){
  if(!block.includes(expected))throw new Error(`Missing full-width logo contract: ${expected}`);
}
if(block.indexOf('header .app-logo-slot img')>block.indexOf('@media(min-width:761px)'))throw new Error('Full-width logo must also apply on narrow sidebars');
if(!block.includes("version:'2026.08.29.5'"))throw new Error('Sidebar visuals version is stale');
if(!/appNameText[\s\S]*text-align:center!important/.test(block))throw new Error('Software name must be centered beneath the logo');
if(!block.includes('background:#0f766e!important')||!block.includes('color:#fff!important'))throw new Error('Active menu palette is incomplete');
if(!html.includes('ly-sidebar-visuals.js?v=20260829.5'))throw new Error('Sidebar visuals are not loaded');
if(!/@media\(max-width:760px\)[\s\S]*header \.app-logo-slot\{width:56px!important[\s\S]*#nav\{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important[\s\S]*overflow-x:auto!important/.test(block))throw new Error('Mobile header must use a clear 56px logo and single-row horizontally scrollable navigation');
if(!/#nav \.nav-group-toggle,#nav>button\{display:inline-flex!important[\s\S]*#nav \.nav-submenu\{display:none!important[\s\S]*\.nav-submenu\.ly-mobile-open\{display:flex!important;position:fixed!important/.test(block))throw new Error('Mobile navigation must show only primary items and open submenus vertically');
if(!/closeMobileMenus[\s\S]*syncMobileToggle[\s\S]*aria-expanded/.test(block))throw new Error('Mobile submenu open, close and accessibility state are incomplete');
if(!/#nav>button\[data-panel\]\{width:46px!important[\s\S]*nav-group-toggle\{width:54px!important[\s\S]*display:none!important/.test(block))throw new Error('Mobile primary navigation must be icon-only and compact');
if(!/function labelPrimaryMenus\(\)[\s\S]*aria-label[\s\S]*title/.test(block))throw new Error('Icon-only mobile navigation must preserve accessible names');
if(!/SIDEBAR_VERSION=RELEASE\.sidebarVisualsAssetVersion[\s\S]*ly-sidebar-visuals\.js\?v=\$\{SIDEBAR_VERSION\}/.test(pages))throw new Error('Pages artifact must retain the current sidebar visuals asset instead of a pinned stale version');
console.log('Sidebar full-width logo layout: PASS');
