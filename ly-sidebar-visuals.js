/* Lát Yên — sidebar identity and readable navigation visuals. */
(()=>{
  'use strict';
  const VERSION='2026.08.31.1';
  if(window.__lySidebarVisuals?.version===VERSION)return;
  let style=document.getElementById('lySidebarVisualsV1');
  if(!style){style=document.createElement('style');style.id='lySidebarVisualsV1';document.head.appendChild(style);}
  style.textContent=`
  header .brand-wrap{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:8px!important;width:100%!important;min-width:0!important}
  header .app-logo-slot{display:flex!important;width:100%!important;max-width:none!important;height:auto!important;min-width:0!important;min-height:0!important;flex:none!important;margin:0!important;padding:0!important}
  header .app-logo-slot img{display:block!important;width:100%!important;max-width:none!important;height:auto!important;max-height:none!important;object-fit:contain!important;object-position:center!important;border-radius:10px!important}
  header .brand-wrap .brand{text-align:center!important;width:100%!important}
  header #appNameText{display:block!important;width:100%!important;text-align:center!important;font-size:14px!important;line-height:1.3!important}
  #nav{color:#18324a!important}
  #nav button[data-panel],#nav .nav-group-toggle{color:#18324a!important;background:transparent!important;border:1px solid transparent!important}
  #nav button[data-panel]:hover,#nav .nav-group-toggle:hover{background:#edf6f5!important;border-color:#d5e8e5!important;color:#0f5f59!important}
  #nav .nav-group.open>.nav-group-toggle,#nav .nav-group-toggle[aria-expanded="true"]{background:#f0f7f6!important;color:#0f5f59!important}
  #nav button[data-panel].active,#nav button[data-panel][aria-current="page"]{background:#0f6cbd!important;border-color:#0f6cbd!important;color:#fff!important;box-shadow:0 2px 7px rgba(15,108,189,.26)!important}
  #nav button[data-panel].active .nav-icon,#nav button[data-panel][aria-current="page"] .nav-icon{background:rgba(255,255,255,.14)!important;border-color:rgba(255,255,255,.34)!important;color:#fff!important}
  #nav button[data-panel].active svg,#nav button[data-panel][aria-current="page"] svg{stroke:#fff!important;color:#fff!important}
  #nav .nav-icon{color:#0f6cbd!important;background:#f3f9ff!important;border:1px solid #c7e0f4!important;box-shadow:none!important}
  #nav .nav-icon svg{stroke-linecap:round!important;stroke-linejoin:round!important;fill:none!important}
  #nav .menu-icon-sales{color:#107c10!important;background:#e7f6e8!important;border-color:#a9d9ac!important}#nav .menu-icon-ingredients{color:#ca5010!important;background:#fff1e5!important;border-color:#f0bd99!important}#nav .menu-icon-imports{color:#c19c00!important;background:#fff9d9!important;border-color:#e8d789!important}#nav .menu-icon-stocktake{color:#8764b8!important;background:#f1eafa!important;border-color:#cdbce6!important}#nav .menu-icon-recipes{color:#d13438!important;background:#fde7e9!important;border-color:#f3b5ba!important}#nav .menu-icon-finance{color:#5c2d91!important;background:#f3eefa!important;border-color:#cdbbe5!important}#nav .menu-icon-cashflow{color:#0078d4!important;background:#e5f3ff!important;border-color:#aed7f5!important}#nav .menu-icon-employees{color:#038387!important;background:#e5f6f6!important;border-color:#a9dcdc!important}#nav .menu-icon-warehouses{color:#0f6cbd!important;background:#e8f3fc!important;border-color:#b5d5f0!important}#nav .menu-icon-history{color:#605e5c!important;background:#f3f2f1!important;border-color:#d8d4d0!important}#nav .menu-icon-settings{color:#69797e!important;background:#edf0f1!important;border-color:#cbd3d6!important}#nav .menu-icon-manage{color:#2563eb!important;background:#eaf1ff!important;border-color:#bfd0f6!important}
  #nav button:not(.active) .menu-icon-sales svg{stroke:#107c10!important}#nav button:not(.active) .menu-icon-ingredients svg{stroke:#ca5010!important}#nav button:not(.active) .menu-icon-imports svg{stroke:#c19c00!important}#nav button:not(.active) .menu-icon-stocktake svg{stroke:#8764b8!important}#nav button:not(.active) .menu-icon-recipes svg{stroke:#d13438!important}#nav button:not(.active) .menu-icon-finance svg{stroke:#5c2d91!important}#nav button:not(.active) .menu-icon-cashflow svg{stroke:#0078d4!important}#nav button:not(.active) .menu-icon-employees svg{stroke:#038387!important}#nav button:not(.active) .menu-icon-warehouses svg{stroke:#0f6cbd!important}#nav button:not(.active) .menu-icon-history svg{stroke:#605e5c!important}#nav button:not(.active) .menu-icon-settings svg{stroke:#69797e!important}#nav button:not(.active) .menu-icon-manage svg{stroke:#2563eb!important}
  #nav button[data-panel="sales"] .nav-icon{color:#107c10!important;background:#edf7ed!important;border-color:#c8e6c9!important}#nav button[data-panel="ingredients"] .nav-icon,#nav button[data-panel="imports"] .nav-icon,#nav button[data-panel="stocktake"] .nav-icon{color:#ca5010!important;background:#fff5eb!important;border-color:#f6d4b5!important}#nav button[data-panel="finance"] .nav-icon,#nav button[data-panel="cashflow"] .nav-icon{color:#5c2d91!important;background:#f6f1fa!important;border-color:#ddcfeb!important}#nav button[data-panel="employees"] .nav-icon,#nav button[data-panel="warehouses"] .nav-icon,#nav button[data-panel="history"] .nav-icon{color:#0f6cbd!important;background:#f3f9ff!important;border-color:#c7e0f4!important}#nav button[data-panel="settings"] .nav-icon{color:#605e5c!important;background:#f3f2f1!important;border-color:#dedbd9!important}
  #nav .nav-lock,#nav .lock-icon,[data-lock]{color:#159467!important}
  .ly-warehouse-security{border:1px solid #cbd5e1;border-radius:12px;padding:14px;background:#f8fafc}.ly-security-toggle{display:flex;gap:10px;align-items:flex-start;cursor:pointer}.ly-security-toggle input{width:18px;height:18px;margin-top:2px}.ly-security-toggle span{display:grid;gap:3px}.ly-security-toggle small{color:#64748b;font-weight:400}.ly-password-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.ly-warehouse-security #wCurrentPasswordWrap{margin-top:12px}.is-hidden{display:none!important}.ly-delete-warning{padding:14px;border:1px solid #fecaca;border-radius:12px;background:#fff1f2;color:#991b1b}.ly-delete-warning p{margin:6px 0 0}.ly-delete-counts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.ly-delete-counts span{padding:8px;border:1px solid #e2e8f0;border-radius:8px;text-align:center;background:#fff}
@media(min-width:761px){
  #nav button[data-panel],#nav .nav-group-toggle{min-height:44px!important;font-size:13px!important;line-height:1.3!important;gap:10px!important}
  #nav .nav-submenu button[data-panel]{min-height:42px!important;padding-top:7px!important;padding-bottom:7px!important}
  #nav .nav-icon{width:32px!important;height:32px!important;min-width:32px!important;min-height:32px!important;flex:0 0 32px!important;border-radius:9px!important}
  #nav .nav-icon svg{width:18px!important;height:18px!important;stroke-width:1.9!important}
  #nav .nav-submenu .nav-icon{width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;flex-basis:30px!important}
  #nav .nav-submenu .nav-icon svg{width:17px!important;height:17px!important}
}
@media(max-width:760px){
  header{position:fixed!important;top:0!important;left:0!important;right:0!important;width:100%!important;z-index:1000!important;max-height:none!important;overflow:visible!important}
  header .top{gap:8px!important}
  header .brand-wrap{flex-direction:row!important;align-items:center!important;gap:9px!important}
  header .app-logo-slot{width:56px!important;max-width:56px!important;height:56px!important;min-width:56px!important;min-height:56px!important;flex:0 0 56px!important}
  header .app-logo-slot img{width:56px!important;max-width:56px!important;height:56px!important;max-height:56px!important;object-fit:contain!important}
  header .brand-wrap .brand,header #appNameText{min-width:0!important;text-align:left!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
  #nav{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;width:100%!important;max-width:100vw!important;padding:7px 10px 9px!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:thin!important;overscroll-behavior-x:contain!important;-webkit-overflow-scrolling:touch}
  #nav .nav-group,#nav .nav-submenu{display:contents!important}
  #nav .nav-group-toggle{display:none!important}
  #nav>button[data-panel],#nav .nav-submenu button[data-panel]{display:inline-flex!important;flex:0 0 44px!important;width:44px!important;min-width:44px!important;max-width:44px!important;min-height:44px!important;height:44px!important;margin:0!important;padding:7px!important;align-items:center!important;justify-content:center!important;gap:0!important;white-space:nowrap!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important}
  #nav .nav-icon{width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;flex:0 0 30px!important;border-radius:9px!important}
  #nav .nav-icon svg{width:18px!important;height:18px!important;stroke-width:2!important}
  #nav .nav-submenu .nav-icon{width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;flex:0 0 30px!important}
  #nav .nav-submenu .nav-icon svg{width:18px!important;height:18px!important}
  #nav .v238-nav-section-label,#nav .v238-nav-spacer{display:none!important}
  #nav>button>span:last-child,#nav .nav-submenu button>span:last-child{display:none!important}
  html body header .app-logo-slot img{width:56px!important;max-width:56px!important;height:56px!important;max-height:56px!important}
  main{margin-left:0!important;margin-top:var(--ly-mobile-header-height,190px)!important;width:100%!important;padding-top:12px!important}
}
@media(max-width:620px){.ly-password-grid,.ly-delete-counts{grid-template-columns:1fr 1fr}}
`;
  const mobileQuery=window.matchMedia?.('(max-width:760px)');
  let mobileMode=false;
  const directChild=(parent,className)=>[...(parent?.children||[])].find(child=>child.classList?.contains(className))||null;
  const menuPairs=()=>[...document.querySelectorAll('#nav .nav-group')].map(group=>({group,toggle:directChild(group,'nav-group-toggle'),submenu:directChild(group,'nav-submenu')})).filter(pair=>pair.toggle&&pair.submenu);
  function labelPrimaryMenus(){document.querySelectorAll('#nav>button[data-panel]').forEach(button=>{const label=button.lastElementChild?.textContent?.trim()||button.textContent?.trim();if(label){button.setAttribute('aria-label',label);button.setAttribute('title',label);}});menuPairs().forEach(({toggle})=>{const label=toggle.querySelector('.nav-label>span:last-child')?.textContent?.trim();if(label){toggle.setAttribute('aria-label',label);toggle.setAttribute('title',label);}});}
  function closeMobileMenus(){if(!mobileQuery?.matches)return;menuPairs().forEach(({toggle,submenu})=>{toggle.classList.remove('open');toggle.setAttribute('aria-expanded','false');submenu.classList.remove('open','ly-mobile-open');});}
  function syncMobileHeaderOffset(){if(!mobileQuery?.matches)return;const header=document.querySelector('header');if(!header)return;document.documentElement.style.setProperty('--ly-mobile-header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);}
  function enterMobileMode(){if(!mobileQuery?.matches)return;mobileMode=true;labelPrimaryMenus();closeMobileMenus();syncMobileHeaderOffset();}
  function leaveMobileMode(){if(mobileQuery?.matches)return;mobileMode=false;document.documentElement.style.removeProperty('--ly-mobile-header-height');menuPairs().forEach(({submenu})=>submenu.classList.remove('ly-mobile-open'));}
  function toggleMobileMenu(toggle){return Boolean(mobileQuery?.matches&&toggle);}
  window.addEventListener('resize',()=>{if(mobileQuery?.matches){if(!mobileMode)enterMobileMode();syncMobileHeaderOffset();}else if(mobileMode)leaveMobileMode();},{passive:true});
  window.addEventListener('latyen:panel',()=>{if(mobileQuery?.matches){labelPrimaryMenus();syncMobileHeaderOffset();}});
  if(window.ResizeObserver){const header=document.querySelector('header');if(header)new ResizeObserver(()=>syncMobileHeaderOffset()).observe(header);}
  if(mobileQuery?.matches)enterMobileMode();
  window.__lySidebarVisuals={version:VERSION,closeMobileMenus,toggleMobileMenu};
})();
