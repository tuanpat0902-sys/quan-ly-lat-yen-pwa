import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const block=fs.readFileSync(new URL('../ly-sidebar-visuals.js',import.meta.url),'utf8');
const pages=fs.readFileSync(new URL('./prepare-pages-artifact.mjs',import.meta.url),'utf8');
for(const expected of ['header .brand-wrap','header .app-logo-slot img','width:100%!important','max-width:none!important','height:auto!important','object-fit:contain!important']){
  if(!block.includes(expected))throw new Error(`Missing full-width logo contract: ${expected}`);
}
if(block.indexOf('header .app-logo-slot img')>block.indexOf('@media(min-width:761px)'))throw new Error('Full-width logo must also apply on narrow sidebars');
if(!block.includes("const VERSION='2026.08.29.9'"))throw new Error('Sidebar visuals version is stale');
if(!/appNameText[\s\S]*text-align:center!important/.test(block))throw new Error('Software name must be centered beneath the logo');
if(!block.includes('background:#0f766e!important')||!block.includes('color:#fff!important'))throw new Error('Active menu palette is incomplete');
if(!html.includes('ly-sidebar-visuals.js?v=20260829.9'))throw new Error('Sidebar visuals are not loaded');
if(!/@media\(max-width:760px\)[\s\S]*header\{position:fixed!important[\s\S]*header \.app-logo-slot\{width:56px!important[\s\S]*#nav\{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important[\s\S]*overflow-x:auto!important/.test(block))throw new Error('Mobile header must stay fixed with a clear 56px logo and single-row horizontally scrollable navigation');
if(!/#nav \.nav-group-toggle,#nav>button\{display:inline-flex!important[\s\S]*#nav \.nav-submenu\{display:none!important[\s\S]*\.nav-submenu\.ly-mobile-open\{display:flex!important;position:fixed!important/.test(block))throw new Error('Mobile navigation must show only primary items and open submenus vertically');
if(!/closeMobileMenus[\s\S]*syncMobileToggle\(toggle,shouldOpen\)[\s\S]*aria-expanded/.test(block)||!/function toggleMobileMenu\(toggle\)[\s\S]*syncMobileToggle\(toggle,!submenu\.classList\.contains\('ly-mobile-open'\)\)/.test(block))throw new Error('Mobile submenu must open on the first tap independently of the selected group state');
if(block.includes(':scope>'))throw new Error('Mobile submenu discovery must not depend on :scope support in older Safari/WebViews');
if(/pointerup[\s\S]*toggleMobileMenu|lastPointerToggle/.test(block))throw new Error('Mobile submenus must not race pointer and synthesized click handlers');
if(!/touch-action:manipulation!important/.test(block))throw new Error('Mobile group toggles must request reliable tap handling');
if(!/window\.__lySidebarVisuals\?\.toggleMobileMenu\?\.\(btn\)/.test(html))throw new Error('Inline menu activation must delegate phone taps to the cross-device submenu owner');
if(!/window\.__lySidebarVisuals\?\.toggleMobileMenu\?\.\(btn\)\)return;[\s\S]*submenu\.classList\.contains\('open'\)/.test(html))throw new Error('Navigation must delegate mobile behavior once while retaining the native desktop fallback');
if(!/window\.__lySidebarVisuals\?\.version===VERSION[\s\S]*let style=document\.getElementById\('lySidebarVisualsV1'\)/.test(block))throw new Error('Sidebar initialization must recover when the style exists but behavior was not installed');
if(!/#nav \.nav-icon\{width:38px!important/.test(block)||!/#nav \.nav-group\{[^}]*flex:1 0 58px!important/.test(block)||!/--ly-mobile-header-height/.test(block))throw new Error('Mobile primary icons must be larger, balanced and offset the fixed header');
if(!/#nav \.nav-group-toggle,#nav>button\{display:inline-flex!important[\s\S]*min-width:58px!important[\s\S]*display:none!important/.test(block))throw new Error('Mobile primary navigation must be icon-only, balanced and touch friendly');
if(!/function labelPrimaryMenus\(\)[\s\S]*aria-label[\s\S]*title/.test(block))throw new Error('Icon-only mobile navigation must preserve accessible names');
if(!/SIDEBAR_VERSION=RELEASE\.sidebarVisualsAssetVersion[\s\S]*ly-sidebar-visuals\.js\?v=\$\{SIDEBAR_VERSION\}/.test(pages))throw new Error('Pages artifact must retain the current sidebar visuals asset instead of a pinned stale version');
console.log('Sidebar full-width logo layout: PASS');
