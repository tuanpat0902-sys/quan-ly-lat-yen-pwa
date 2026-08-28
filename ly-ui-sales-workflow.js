(()=>{
  'use strict';
  if(window.__lyUISalesWorkflow?.version==='2026.08.28.3')return;
  const VERSION='2026.08.28.3',STYLE_ID='lyUiSalesWorkflowStyle';
  const CSS=`
#saleReportArea{min-width:0}
#saleReportArea .sale-analysis-grid{align-items:start!important}
#saleReportArea .sale-analysis-panel{height:auto!important;min-height:0!important;align-self:start!important}
#saleReportArea .scroll{max-height:none!important;overflow-x:auto!important;overflow-y:visible!important}
#saleReportArea .scroll>table{width:100%!important;min-width:100%!important;max-width:100%!important;table-layout:auto!important}
#saleReportArea .scroll>table th,#saleReportArea .scroll>table td{white-space:normal!important;overflow-wrap:anywhere}
#saleReportArea [data-ly-sales-revenue-card]{border-color:color-mix(in srgb,var(--primary,#0f766e) 28%,var(--border,#e4e7ec));background:linear-gradient(180deg,color-mix(in srgb,var(--primary,#0f766e) 5%,#fff),#fff)}
#saleReportArea [data-ly-sales-revenue-card] .value{font-size:clamp(20px,2.3vw,26px)!important;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
@media(max-width:700px){#saleReportArea .sale-analysis-grid{grid-template-columns:1fr!important}}
@media(max-width:430px){#saleReportArea [data-ly-sales-revenue-card]{order:-1}}
`;
  function mount(){let style=document.getElementById?.(STYLE_ID);if(!style){style=document.createElement?.('style');if(!style)return false;style.id=STYLE_ID;(document.head||document.documentElement)?.appendChild?.(style);}if(style.textContent!==CSS)style.textContent=CSS;return true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.__lyUISalesWorkflow=Object.freeze({version:VERSION,mount,status:()=>({version:VERSION,mounted:!!document.getElementById?.(STYLE_ID),layoutOwnership:false,reportScrollCorrection:true})});
})();