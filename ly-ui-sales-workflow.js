(()=>{
  'use strict';
  if(window.__lyUISalesWorkflow?.version==='2026.08.28.1')return;
  const VERSION='2026.08.28.1',STYLE_ID='lyUiSalesWorkflowStyle';
  const CSS=`
#saleReportArea{min-width:0}
#saleReportArea .sale-qty-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;align-items:stretch}
#saleReportArea .sale-qty-summary>.card{min-width:0;height:100%;display:flex;flex-direction:column;justify-content:center;gap:4px}
#saleReportArea [data-ly-sales-revenue-card]{border-color:color-mix(in srgb,var(--primary,#0f766e) 28%,var(--border,#e4e7ec));background:linear-gradient(180deg,color-mix(in srgb,var(--primary,#0f766e) 5%,#fff),#fff)}
#saleReportArea [data-ly-sales-revenue-card] .value{font-size:clamp(20px,2.3vw,26px)!important;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
#saleReportArea :where(#saleReportMode,#saleReportDate,#saleReportMonth,#saleReportYear,#saleReportFrom,#saleReportTo){min-height:40px}
#saleReportArea .toolbar{flex-wrap:wrap;align-items:end;gap:8px}
#saleReportArea .toolbar>:where(label,div){min-width:0}
#saleReportArea table td,#saleReportArea table th{white-space:nowrap}
@media(max-width:760px){
  #saleReportArea .sale-qty-summary{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  #saleReportArea .sale-qty-summary>.card{padding:12px!important}
  #saleReportArea .toolbar>:where(input,select,button){flex:1 1 145px;width:auto!important}
}
@media(max-width:430px){
  #saleReportArea .sale-qty-summary{grid-template-columns:1fr}
  #saleReportArea [data-ly-sales-revenue-card]{order:-1}
  #saleReportArea .toolbar>:where(input,select,button){flex-basis:100%}
}
`;
  function mount(){let style=document.getElementById?.(STYLE_ID);if(!style){style=document.createElement?.('style');if(!style)return false;style.id=STYLE_ID;(document.head||document.documentElement)?.appendChild?.(style);}if(style.textContent!==CSS)style.textContent=CSS;return true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.__lyUISalesWorkflow=Object.freeze({version:VERSION,mount,status:()=>({version:VERSION,mounted:!!document.getElementById?.(STYLE_ID)})});
})();