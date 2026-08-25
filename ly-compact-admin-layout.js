/* Lát Yên — compact Settings and supplier-management layout. */
(()=>{
  'use strict';
  if(document.getElementById('lyCompactAdminLayoutV1'))return;
  const style=document.createElement('style');
  style.id='lyCompactAdminLayoutV1';
  style.textContent=`
:root{--ly-ui-font:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--ly-font-xs:10px;--ly-font-sm:11px;--ly-font-base:12px;--ly-font-md:14px;--ly-font-lg:18px;--ly-font-kpi:20px}
html,body,button,input,select,textarea,table{font-family:var(--ly-ui-font)!important}
body{font-size:var(--ly-font-base)!important;line-height:1.45}
h1{font-size:22px!important;line-height:1.25}h2{font-size:var(--ly-font-lg)!important;line-height:1.3}h3,.card h3{font-size:var(--ly-font-md)!important;line-height:1.35}h4{font-size:13px!important;line-height:1.35}
label,.muted,small,.footer-note{font-size:var(--ly-font-sm)!important;line-height:1.4}
button,input,select,textarea{font-size:var(--ly-font-base);line-height:1.35}
table th{font-size:var(--ly-font-sm)!important;line-height:1.3}table td{font-size:var(--ly-font-base)!important;line-height:1.4}
.metric .value,.finance-kpi b,.cashflow-kpi b{font-size:var(--ly-font-kpi)!important;line-height:1.2}
.badge,.cashflow-type{font-size:var(--ly-font-xs)!important}
#nav button[data-panel],#nav .nav-group-toggle{font-size:var(--ly-font-base)!important}
.ly-note-compact{display:-webkit-box;max-width:260px;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;white-space:normal;overflow-wrap:anywhere;line-height:1.35;color:#52606d}
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
.sale-chart-panel h3{white-space:normal;line-height:1.35;margin-bottom:10px}
.sale-chart-scroll{width:100%;overflow-x:auto;overflow-y:hidden;padding:2px 0 8px;overscroll-behavior-inline:contain}
#sales .sale-chart-scroll canvas{width:max(720px,100%)!important;max-width:none!important;max-height:none!important;display:block}
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
/* Phone workspace: preserve touch targets while removing unused vertical space. */
@media(max-width:600px){
  html,body{width:100%;max-width:100%;overflow-x:hidden!important}
  main{padding:8px!important}
  main,.panel,.card,.grid,.grid2,.form-grid,.toolbar,.scroll,.inline-import-form,.inline-import-form-inner{min-width:0!important;max-width:100%!important}
  .card{padding:10px!important;border-radius:12px!important}
  .grid,.grid2{grid-template-columns:1fr!important;gap:8px!important}
  .section-gap{margin-top:9px!important}
  .toolbar{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px!important;align-items:end!important}
  .toolbar .spacer{display:none!important}
  .toolbar>input,.toolbar>select,.toolbar>button,.toolbar>div{width:100%!important;min-width:0!important;max-width:none!important}
  .toolbar>div>input,.toolbar>div>select{width:100%!important;min-width:0!important}
  .scroll{width:100%!important;overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:thin}
  .scroll>table{margin:0;max-width:none}
  canvas,svg{max-width:100%!important}
  .modal{padding:6px!important}
  .modal-box,.import-receipt-modal{width:100%!important;max-width:100%!important;max-height:calc(100dvh - 12px)!important;padding:10px!important;border-radius:12px!important}
  .modal-head{gap:8px!important;margin-bottom:9px!important}
  .notice,.warnbox,.empty{padding:9px!important}
  .inline-import-form{margin-top:10px!important;padding-top:10px!important}
  .inline-import-form .form-grid{gap:7px!important}
  .inline-import-form .section-gap{margin-top:9px!important}
  .inline-import-form input,.inline-import-form select{height:36px!important;min-height:36px!important;padding:5px 7px!important}
  .inline-import-form .receipt-modal-actions{position:sticky;bottom:0;z-index:4;margin:10px -10px -10px!important;padding:9px 10px max(9px,env(safe-area-inset-bottom))!important;background:rgba(255,255,255,.96);backdrop-filter:blur(8px)}
  body:has(#inlineImportReceiptForm.open,#inlineExportReceiptForm.open,#inlineStocktakeForm.open,#inlineSaleReceiptForm.open,#inlineRecipeForm.open,#ingredientInlinePanel.open) #lyAssistantLauncher{display:none!important}

  #sales .import-page-toolbar{gap:8px!important}
  #inlineSaleReceiptForm .form-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  #inlineSaleReceiptForm .form-grid>.full,#inlineSaleReceiptForm #saleCustomSourceWrap{grid-column:1/-1!important}
  #inlineSaleReceiptForm .import-receipt-header{min-height:36px;gap:8px}
  #inlineSaleReceiptForm .import-receipt-header button{min-height:34px!important;white-space:nowrap}

  #sales .inline-import-form .sale-receipt-line{
    display:grid!important;
    grid-template-columns:24px 40px minmax(54px,.65fr) minmax(106px,1.35fr) minmax(68px,.75fr) 34px!important;
    grid-template-rows:36px 36px!important;
    gap:5px!important;
    min-height:82px!important;
    padding:5px 0!important;
  }
  #sales .inline-import-form .sale-receipt-line .saleStt{grid-column:1!important;grid-row:1!important;width:24px!important;min-width:24px!important;max-width:24px!important}
  #sales .inline-import-form .sale-receipt-line .srProduct{grid-column:2/5!important;grid-row:1!important}
  #sales .inline-import-form .sale-receipt-line .srUnit{grid-column:5!important;grid-row:1!important}
  #sales .inline-import-form .sale-receipt-line .srUnit{height:34px!important;min-height:34px!important;justify-content:flex-start;border-radius:7px!important}
  #sales .inline-import-form .sale-receipt-line>button{grid-column:6!important;grid-row:1!important;justify-self:end!important;width:34px!important;min-width:34px!important;max-width:34px!important;height:34px!important;min-height:34px!important}
  #sales .inline-import-form .sale-receipt-line .srQty{grid-column:1/3!important;grid-row:2!important}
  #sales .inline-import-form .sale-receipt-line .srPrice{grid-column:3!important;grid-row:2!important;text-align:right!important;font-size:10.5px!important;overflow:hidden;text-overflow:ellipsis}
  #sales .inline-import-form .sale-receipt-line .srItemDiscount{grid-column:4!important;grid-row:2!important}
  #sales .inline-import-form .sale-receipt-line .srLineTotal{grid-column:5/7!important;grid-row:2!important;text-align:right!important;font-size:11px!important;overflow:hidden;text-overflow:ellipsis}
  #sales .sale-item-discount{grid-template-columns:52px minmax(0,1fr)!important;gap:4px!important}
  #sales .sale-item-discount select,#sales .sale-item-discount input{font-size:10.5px!important;padding:4px!important}
  #sales .sale-payment-summary{margin-top:9px!important;border-radius:10px!important}
  #sales .sale-payment-summary>div{padding:6px 9px!important}
  #sales .sale-payment-summary .sale-final-total b{font-size:16px!important}
}
@media(max-width:420px){.toolbar{grid-template-columns:1fr!important}}
`;
  document.head.appendChild(style);
  window.__lyCompactAdminLayout={version:'2026.08.25.3'};
})();
