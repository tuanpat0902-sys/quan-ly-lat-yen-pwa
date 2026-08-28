(()=>{
  'use strict';
  if(window.__lyUISalesWorkflow?.version==='2026.08.28.3')return;
  const VERSION='2026.08.28.3',STYLE_ID='lyUiSalesWorkflowStyle';
  const CSS=`
#saleReportArea{min-width:0}
#saleReportArea .scroll,#recentSalesArea .scroll{max-height:none!important;height:auto!important}
#saleReportArea [data-ly-sales-revenue-card]{border-color:color-mix(in srgb,var(--primary,#0f766e) 28%,var(--border,#e4e7ec));background:linear-gradient(180deg,color-mix(in srgb,var(--primary,#0f766e) 5%,#fff),#fff)}
#saleReportArea [data-ly-sales-revenue-card] .value{font-size:clamp(20px,2.3vw,26px)!important;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
@media(max-width:430px){#saleReportArea [data-ly-sales-revenue-card]{order:-1}}
`;
  function mount(){let style=document.getElementById?.(STYLE_ID);if(!style){style=document.createElement?.('style');if(!style)return false;style.id=STYLE_ID;(document.head||document.documentElement)?.appendChild?.(style);}if(style.textContent!==CSS)style.textContent=CSS;return true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.__lyUISalesWorkflow=Object.freeze({version:VERSION,mount,status:()=>({version:VERSION,mounted:!!document.getElementById?.(STYLE_ID),layoutOwnership:'scroll-height-only'})});
})();