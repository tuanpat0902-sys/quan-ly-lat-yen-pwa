(()=>{
  'use strict';
  if(window.__lyUISalesWorkflow?.version==='2026.08.29.5')return;
  const VERSION='2026.08.29.5',STYLE_ID='lyUiSalesWorkflowStyle';
  const CSS=`
#saleReportArea{min-width:0}
#saleReportArea .sale-qty-summary{display:grid!important;grid-template-columns:minmax(0,1.15fr) repeat(3,minmax(0,1fr))!important;gap:10px!important;align-items:stretch!important}
#saleReportArea .sale-qty-summary>.card{min-width:0!important;height:100%!important}
#saleReportArea .sale-table-panel .scroll,#recentSalesArea .scroll{height:auto!important;overflow-y:auto!important;overscroll-behavior-y:contain!important;scrollbar-gutter:stable!important}
#saleReportArea .sale-table-panel .scroll{max-height:min(62dvh,560px)!important}
#recentSalesArea .scroll{max-height:min(68dvh,640px)!important}
#saleReportArea [data-ly-sales-revenue-card]{border-color:color-mix(in srgb,var(--primary,#0f766e) 28%,var(--border,#e4e7ec));background:linear-gradient(180deg,color-mix(in srgb,var(--primary,#0f766e) 5%,#fff),#fff)}
#saleReportArea [data-ly-sales-revenue-card] .value{font-size:clamp(20px,2.3vw,26px)!important;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
@media(max-width:900px){#saleReportArea .sale-qty-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:760px){#saleReportArea .sale-table-panel .scroll{max-height:min(58dvh,520px)!important}#recentSalesArea .scroll{max-height:min(62dvh,560px)!important}}
@media(max-width:600px){#saleReportArea .sale-qty-summary{grid-template-columns:1fr!important}#saleReportArea [data-ly-sales-revenue-card]{order:-1}}
`;
  function mount(){let style=document.getElementById?.(STYLE_ID);if(!style){style=document.createElement?.('style');if(!style)return false;style.id=STYLE_ID;(document.head||document.documentElement)?.appendChild?.(style);}if(style.textContent!==CSS)style.textContent=CSS;return true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.__lyUISalesWorkflow=Object.freeze({version:VERSION,mount,status:()=>({version:VERSION,mounted:!!document.getElementById?.(STYLE_ID),layoutOwnership:'bounded-sales-table-scroll'})});
})();
