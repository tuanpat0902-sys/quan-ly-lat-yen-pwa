import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const block=fs.readFileSync(new URL('../ly-sidebar-visuals.js',import.meta.url),'utf8');
const pages=fs.readFileSync(new URL('./prepare-pages-artifact.mjs',import.meta.url),'utf8');
for(const expected of ['header .brand-wrap','header .app-logo-slot img','width:100%!important','max-width:none!important','height:auto!important','object-fit:contain!important']){
  if(!block.includes(expected))throw new Error(`Missing full-width logo contract: ${expected}`);
}
if(block.indexOf('header .app-logo-slot img')>block.indexOf('@media(min-width:761px)'))throw new Error('Full-width logo must also apply on narrow sidebars');
if(!block.includes("const VERSION='2026.08.31.1'"))throw new Error('Sidebar visuals version is stale');
if(!/appNameText[\s\S]*text-align:center!important/.test(block))throw new Error('Software name must be centered beneath the logo');
if(!block.includes('background:#0f6cbd!important')||!block.includes('color:#fff!important')||!block.includes('stroke-linecap:round!important'))throw new Error('Windows-style Fluent active menu palette and icon treatment are incomplete');
if(!html.includes('ly-sidebar-visuals.js?v=20260831.1'))throw new Error('Sidebar visuals are not loaded');
if(!/@media\(max-width:760px\)[\s\S]*header\{position:fixed!important[\s\S]*header \.app-logo-slot\{width:56px!important[\s\S]*#nav\{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important[\s\S]*overflow-x:auto!important/.test(block))throw new Error('Mobile header must stay fixed with a clear 56px logo and single-row horizontally scrollable navigation');
if(!/#nav\{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important[\s\S]*overflow-x:auto!important/.test(block)||!/#nav \.nav-group,#nav \.nav-submenu\{display:contents!important\}[\s\S]*#nav \.nav-group-toggle\{display:none!important\}[\s\S]*#nav>button\[data-panel\],#nav \.nav-submenu button\[data-panel\]\{display:inline-flex!important/.test(block))throw new Error('Mobile navigation must expose every authorized item in the single horizontal scroller');
if(!/function toggleMobileMenu\(toggle\)\{return Boolean\(mobileQuery\?\.matches&&toggle\);\}/.test(block))throw new Error('Hidden mobile group toggles must not fall through to desktop submenu behavior');
if(block.includes(':scope>'))throw new Error('Mobile submenu discovery must not depend on :scope support in older Safari/WebViews');
if(/pointerup[\s\S]*toggleMobileMenu|lastPointerToggle/.test(block))throw new Error('Mobile submenus must not race pointer and synthesized click handlers');
if(!/touch-action:manipulation!important/.test(block))throw new Error('Mobile menu items must request reliable tap handling');
if(!/window\.__lySidebarVisuals\?\.toggleMobileMenu\?\.\(btn\)/.test(html))throw new Error('Inline menu activation must delegate phone taps to the cross-device submenu owner');
if(!/window\.__lySidebarVisuals\?\.toggleMobileMenu\?\.\(btn\)\)return;[\s\S]*submenu\.classList\.contains\('open'\)/.test(html))throw new Error('Navigation must delegate mobile behavior once while retaining the native desktop fallback');
if(!/window\.__lySidebarVisuals\?\.version===VERSION[\s\S]*let style=document\.getElementById\('lySidebarVisualsV1'\)/.test(block))throw new Error('Sidebar initialization must recover when the style exists but behavior was not installed');
if(!/#nav \.nav-icon\{width:30px!important/.test(block)||!/#nav \.nav-group,#nav \.nav-submenu\{display:contents!important/.test(block)||!/--ly-mobile-header-height/.test(block))throw new Error('Mobile horizontal items must remain readable and offset the fixed header');
if(!/#nav>button\[data-panel\],#nav \.nav-submenu button\[data-panel\]\{[\s\S]*flex:0 0 44px!important[\s\S]*width:44px!important[\s\S]*#nav>button>span:last-child,#nav \.nav-submenu button>span:last-child\{display:none!important\}/.test(block))throw new Error('Mobile navigation must use compact icon-only buttons for both primary and submenu items');
if(!/SIDEBAR_VERSION=RELEASE\.sidebarVisualsAssetVersion[\s\S]*ly-sidebar-visuals\.js\?v=\$\{SIDEBAR_VERSION\}/.test(pages))throw new Error('Pages artifact must retain the current sidebar visuals asset instead of a pinned stale version');
console.log('Sidebar full-width logo layout: PASS');
