/* Lát Yên — sidebar identity and readable navigation visuals. */
(()=>{
  'use strict';
  if(document.getElementById('lySidebarVisualsV1'))return;
  const style=document.createElement('style');
  style.id='lySidebarVisualsV1';
  style.textContent=`
  header .brand-wrap{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:8px!important;width:100%!important;min-width:0!important}
  header .app-logo-slot{display:flex!important;width:100%!important;max-width:none!important;height:auto!important;min-width:0!important;min-height:0!important;flex:none!important;margin:0!important;padding:0!important}
  header .app-logo-slot img{display:block!important;width:100%!important;max-width:none!important;height:auto!important;max-height:none!important;object-fit:contain!important;object-position:center!important;border-radius:10px!important}
  header .brand-wrap .brand{text-align:left!important;width:100%!important}
  #nav{color:#18324a!important}
  #nav button[data-panel],#nav .nav-group-toggle{color:#18324a!important;background:transparent!important;border:1px solid transparent!important}
  #nav button[data-panel]:hover,#nav .nav-group-toggle:hover{background:#edf6f5!important;border-color:#d5e8e5!important;color:#0f5f59!important}
  #nav .nav-group.open>.nav-group-toggle,#nav .nav-group-toggle[aria-expanded="true"]{background:#f0f7f6!important;color:#0f5f59!important}
  #nav button[data-panel].active,#nav button[data-panel][aria-current="page"]{background:#0f766e!important;border-color:#0f766e!important;color:#fff!important;box-shadow:0 4px 12px rgba(15,118,110,.18)!important}
  #nav button[data-panel].active .nav-icon,#nav button[data-panel][aria-current="page"] .nav-icon{background:rgba(255,255,255,.14)!important;border-color:rgba(255,255,255,.34)!important;color:#fff!important}
  #nav button[data-panel].active svg,#nav button[data-panel][aria-current="page"] svg{stroke:#fff!important;color:#fff!important}
  #nav .nav-icon{color:#2563eb!important;background:#fff!important;border:1px solid #d7e3f4!important}
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
@media(max-width:620px){.ly-password-grid,.ly-delete-counts{grid-template-columns:1fr 1fr}}
`;
  document.head.appendChild(style);
  window.__lySidebarVisuals={version:'2026.08.24.2'};
})();
