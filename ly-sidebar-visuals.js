/* Lát Yên — sidebar identity and readable navigation visuals. */
(()=>{
  'use strict';
  if(document.getElementById('lySidebarVisualsV1'))return;
  const style=document.createElement('style');
  style.id='lySidebarVisualsV1';
  style.textContent=`
@media(min-width:761px){
  header .brand-wrap{flex-direction:column!important;align-items:stretch!important;gap:8px!important}
  header .app-logo-slot{display:flex!important;width:100%!important;max-width:none!important;height:auto!important;min-width:0!important;min-height:0!important;flex:none!important;margin:0!important}
  header .app-logo-slot img{display:block!important;width:100%!important;max-width:100%!important;height:auto!important;max-height:none!important;object-fit:contain!important;object-position:center!important;border-radius:10px!important}
  header .brand-wrap .brand{text-align:left!important;width:100%!important}
  #nav button[data-panel],#nav .nav-group-toggle{min-height:44px!important;font-size:13px!important;line-height:1.3!important;gap:10px!important}
  #nav .nav-submenu button[data-panel]{min-height:42px!important;padding-top:7px!important;padding-bottom:7px!important}
  #nav .nav-icon{width:32px!important;height:32px!important;min-width:32px!important;min-height:32px!important;flex:0 0 32px!important;border-radius:9px!important}
  #nav .nav-icon svg{width:18px!important;height:18px!important;stroke-width:1.9!important}
  #nav .nav-submenu .nav-icon{width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;flex-basis:30px!important}
  #nav .nav-submenu .nav-icon svg{width:17px!important;height:17px!important}
}`;
  document.head.appendChild(style);
  window.__lySidebarVisuals={version:'2026.08.24.1'};
})();
