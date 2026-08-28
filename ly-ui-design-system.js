(()=>{
  'use strict';
  if(window.__lyUIDesignSystem?.version==='2026.08.28.1')return;
  const VERSION='2026.08.28.1';
  const STYLE_ID='lyUiDesignSystemStyle';
  const CSS=`
:root{
  --ly-space-1:4px;--ly-space-2:8px;--ly-space-3:12px;--ly-space-4:16px;--ly-space-5:20px;--ly-space-6:24px;
  --ly-radius-sm:8px;--ly-radius-md:12px;--ly-radius-lg:16px;
  --ly-font-xs:12px;--ly-font-sm:13px;--ly-font-md:14px;--ly-font-lg:16px;--ly-font-xl:20px;--ly-font-2xl:24px;
  --ly-line-tight:1.25;--ly-line-normal:1.45;--ly-line-relaxed:1.6;
  --ly-border:var(--border,#e4e7ec);--ly-surface:var(--card,#fff);--ly-text:var(--text,#101828);--ly-muted:var(--muted,#667085);
  --ly-shadow-card:0 1px 2px rgba(16,24,40,.04),0 1px 3px rgba(16,24,40,.05);
  --ly-shadow-modal:0 18px 48px rgba(16,24,40,.18);
}
body{font-size:var(--ly-font-md);line-height:var(--ly-line-normal);color:var(--ly-text)}
h1{font-size:clamp(20px,2vw,var(--ly-font-2xl));line-height:var(--ly-line-tight);letter-spacing:-.015em}
h2{font-size:var(--ly-font-xl);line-height:1.3;letter-spacing:-.01em}
h3{font-size:var(--ly-font-lg);line-height:1.35}
:where(.muted,small,.footer-note){color:var(--ly-muted)}
:where(.card){border-radius:var(--ly-radius-md);border-color:var(--ly-border);box-shadow:var(--ly-shadow-card)}
:where(.card,.modal-box){box-sizing:border-box}
:where(.card)>h2:first-child,:where(.card)>h3:first-child{margin-top:0}
:where(.section-gap){margin-top:var(--ly-space-4)}
:where(.grid,.grid2,.form-grid){gap:var(--ly-space-3)}
:where(.toolbar,.top-actions,.receipt-modal-actions,.modal-title-row){gap:var(--ly-space-2)}
:where(button,.primary,.secondary,.danger){border-radius:var(--ly-radius-sm);font-weight:650;line-height:1.25}
:where(.primary,.secondary,.danger){padding-inline:var(--ly-space-3)}
:where(.primary){box-shadow:0 1px 2px rgba(16,24,40,.08)}
:where(input,select,textarea){border-radius:var(--ly-radius-sm);line-height:1.35}
:where(label){font-weight:600;line-height:1.4}
:where(.badge){font-size:var(--ly-font-xs);font-weight:700;letter-spacing:.01em;border-radius:999px}
:where(table){font-size:var(--ly-font-sm)}
:where(th){font-weight:700;color:#475467;background:#f9fafb}
:where(td,th){vertical-align:middle}
:where(.metric .value){font-variant-numeric:tabular-nums;line-height:1.15}
:where(.notice,.warnbox,.empty){border-radius:var(--ly-radius-md)}
:where(.notice,.warnbox){padding:var(--ly-space-3)}
:where(.empty){color:var(--ly-muted);text-align:center}
:where(.modal-box){border-radius:var(--ly-radius-lg);box-shadow:var(--ly-shadow-modal)}
#nav button[data-panel],#nav .nav-group-toggle{border-radius:var(--ly-radius-sm);line-height:1.25}
#nav button[data-panel].active{font-weight:750}
@media(min-width:761px){
  main{padding-block:var(--ly-space-5)}
  :where(.card){padding:var(--ly-space-4)}
  :where(.toolbar,.top-actions){align-items:center}
}
@media(max-width:760px){
  body{font-size:14px}
  h1{font-size:21px}h2{font-size:18px}h3{font-size:16px}
  :where(.grid,.grid2,.form-grid){gap:10px}
  :where(.card){box-shadow:none}
  :where(.top-actions,.toolbar){gap:8px}
  :where(table){font-size:13px}
}
@media(max-width:430px){
  :root{--ly-space-3:10px;--ly-space-4:12px;--ly-space-5:16px}
  :where(.card){border-radius:12px}
  :where(.notice,.warnbox,.empty){border-radius:10px}
}
`;
  function mount(){
    let style=document.getElementById?.(STYLE_ID);
    if(!style){
      style=document.createElement?.('style');
      if(!style)return false;
      style.id=STYLE_ID;
      (document.head||document.documentElement)?.appendChild?.(style);
    }
    if(style.textContent!==CSS)style.textContent=CSS;
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.__lyUIDesignSystem=Object.freeze({version:VERSION,mount,status:()=>({version:VERSION,mounted:!!document.getElementById?.(STYLE_ID)})});
})();
