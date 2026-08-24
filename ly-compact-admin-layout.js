/* Lát Yên — compact Settings and supplier-management layout. */
(()=>{
  'use strict';
  if(document.getElementById('lyCompactAdminLayoutV1'))return;
  const style=document.createElement('style');
  style.id='lyCompactAdminLayoutV1';
  style.textContent=`
#settings{max-width:1320px;margin:0 auto}
#settings .settings-workspace-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px;padding:2px 1px}
#settings .settings-workspace-head h2{margin:0 0 3px;font-size:20px}
#settings .settings-head-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap}
#settings .settings-status-pill,#settings .settings-account-pill{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:4px 9px;border:1px solid #dfe7eb;border-radius:999px;background:#fff;color:#475467;font-size:11.5px;font-weight:700}
#settings .settings-status-pill i{width:7px;height:7px;border-radius:50%;background:#17a673}.settings-status-pill.is-offline i{background:#d64545!important}
#settings .settings-dashboard-grid-v2{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(320px,.92fr);grid-template-areas:'cloud identity' 'notify data';gap:12px;align-items:stretch}
#settings .settings-dashboard-grid-v2>.card,#settings .settings-dashboard-grid-v2>.settings-notify-host{min-width:0;margin:0!important}
#settings .settings-cloud-card{grid-area:cloud}.settings-identity-card{grid-area:identity}.settings-notify-host{grid-area:notify}.settings-data-card{grid-area:data}
#settings .settings-dashboard-grid-v2 .card{padding:14px!important;border-radius:12px!important}
#settings .settings-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}
#settings .settings-card-head h3,#settings .brand-settings-head h3{margin:0 0 2px!important;font-size:14px!important}
#settings .settings-cloud-state{min-height:50px!important;padding:9px!important;margin-top:8px!important;border-radius:8px!important}
#settings .fresh-settings-actions{margin-top:8px!important;gap:7px!important}
#settings .fresh-settings-actions button,#settings .settings-data-actions button{min-height:34px!important;padding:6px 10px!important}
#settings .brand-settings-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:9px}
#settings .brand-preview-logo{width:58px!important;height:58px!important;max-width:58px!important;max-height:58px!important;padding:3px!important;border-radius:9px!important}
#settings .brand-name-actions{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:7px!important}
#settings .brand-name-actions input{min-width:0}
#settings .brand-logo-actions{gap:7px!important}
#settings .settings-data-actions{margin-top:8px!important;gap:7px!important}
#settings .settings-advanced-tools{margin-top:9px;padding-top:8px;border-top:1px solid #edf1f3}
#settings .settings-advanced-tools summary{cursor:pointer;font-size:11.5px;font-weight:750;color:#667085}
#settings .settings-advanced-tools button{margin-top:8px}
#settings .v226-notification-card{height:100%;box-sizing:border-box;padding:14px!important;border-radius:12px!important}
#settings .v226-notify-actions,#settings .v226-notify-options{margin-top:8px!important}
#settings .v226-notify-options{gap:6px!important;padding-top:7px!important}
#settings .v226-notify-options label{min-height:34px!important;padding:6px 8px!important}
#settings .ly-notify-master-hint{margin-top:7px!important;padding:7px 9px!important}
#settings #lyMenuSecuritySettings{margin-top:12px!important;padding:14px!important;border-radius:12px!important}
#settings #lyMenuSecuritySettings .ly-sec-head{align-items:center;gap:10px}
#settings #lyMenuSecuritySettings .ly-sec-icon{width:34px;height:34px;flex:0 0 34px}
#settings #lyMenuSecuritySettings .ly-sec-desc{max-width:920px}
#settings #lyMenuSecuritySettings .ly-sec-fields{margin-top:11px;gap:8px}
#settings #lyMenuSecuritySettings .ly-sec-fields input{height:34px;margin-top:3px}
#settings #lyMenuSecuritySettings .ly-sec-actions{margin-top:9px}
#settings #lyMenuSecuritySettings .ly-sec-note{margin-top:7px}
.supplier-page-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.supplier-page-head h2{margin:0 0 3px}
.supplier-list-card{padding:0!important;overflow:hidden}
.supplier-list-summary{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #e4eaee;background:#f8fbfb}
.supplier-list-card table{margin:0}
.supplier-list-card th,.supplier-list-card td{padding:9px 10px}
.import-receipt-header-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.import-supplier-help{margin:7px 0 9px;padding:7px 9px;border:1px solid #dbe8e6;border-radius:8px;background:#f6fbfa;color:#52636c;font-size:11.5px;line-height:1.4}
@media(max-width:900px){#settings .settings-dashboard-grid-v2{grid-template-columns:1fr;grid-template-areas:'cloud' 'identity' 'notify' 'data'}}
@media(max-width:700px){#settings .settings-workspace-head{align-items:flex-start;flex-direction:column}#settings .settings-head-actions{justify-content:flex-start}#settings .settings-account-pill{max-width:100%;overflow-wrap:anywhere}.supplier-page-head{align-items:flex-start;flex-direction:column}.supplier-page-head button{width:100%}.import-receipt-header-actions{width:100%}.import-receipt-header-actions button{flex:1}.supplier-list-summary{align-items:flex-start;flex-direction:column}}
`;
  document.head.appendChild(style);
  window.__lyCompactAdminLayout={version:'2026.08.24.1'};
})();
