(()=>{
  'use strict';
  if(window.__lyUIDesignSystem?.version==='2026.08.28.2')return;
  const VERSION='2026.08.28.2';
  const STYLE_ID='lyUiDesignSystemStyle';
  const CSS=`
:root{
  --ly-space-1:4px;--ly-space-2:8px;--ly-space-3:12px;--ly-space-4:16px;--ly-space-5:20px;--ly-space-6:24px;--ly-space-7:32px;
  --ly-radius-xs:6px;--ly-radius-sm:8px;--ly-radius-md:12px;--ly-radius-lg:16px;--ly-radius-xl:20px;
  --ly-font-xs:12px;--ly-font-sm:13px;--ly-font-md:14px;--ly-font-lg:16px;--ly-font-xl:20px;--ly-font-2xl:24px;--ly-font-3xl:30px;
  --ly-line-tight:1.22;--ly-line-normal:1.48;--ly-line-relaxed:1.62;
  --ly-border:var(--border,#e4e7ec);--ly-border-soft:#eef2f4;--ly-surface:var(--card,#fff);--ly-surface-soft:#f8fafb;--ly-surface-muted:#f4f6f8;
  --ly-text:var(--text,#101828);--ly-text-strong:#0c111d;--ly-muted:var(--muted,#667085);--ly-muted-2:#98a2b3;
  --ly-primary:var(--primary,#0f766e);--ly-primary-soft:color-mix(in srgb,var(--ly-primary) 8%,#fff);--ly-primary-border:color-mix(in srgb,var(--ly-primary) 28%,var(--ly-border));
  --ly-danger:#b42318;--ly-danger-soft:#fff4f2;--ly-warning:#b54708;--ly-warning-soft:#fff8eb;--ly-success:#027a48;--ly-success-soft:#ecfdf3;
  --ly-shadow-card:0 1px 2px rgba(16,24,40,.035),0 4px 12px rgba(16,24,40,.035);
  --ly-shadow-raised:0 8px 24px rgba(16,24,40,.10),0 2px 6px rgba(16,24,40,.05);
  --ly-shadow-modal:0 24px 64px rgba(16,24,40,.20),0 6px 18px rgba(16,24,40,.08);
}
html{font-feature-settings:'kern' 1,'liga' 1}
body{font-size:var(--ly-font-md);line-height:var(--ly-line-normal);color:var(--ly-text);background:var(--bg,#f6f8fa)}
h1,h2,h3{color:var(--ly-text-strong);text-wrap:balance}
h1{font-size:clamp(21px,2vw,var(--ly-font-2xl));line-height:var(--ly-line-tight);letter-spacing:-.025em;font-weight:780}
h2{font-size:var(--ly-font-xl);line-height:1.3;letter-spacing:-.018em;font-weight:750}
h3{font-size:var(--ly-font-lg);line-height:1.35;letter-spacing:-.008em;font-weight:720}
:where(p){margin-block:0 var(--ly-space-3)}
:where(.muted,small,.footer-note){color:var(--ly-muted)}
:where(.card){border-radius:var(--ly-radius-md);border:1px solid var(--ly-border);box-shadow:var(--ly-shadow-card);background:var(--ly-surface)}
:where(.card,.modal-box){box-sizing:border-box}
:where(.card)>h2:first-child,:where(.card)>h3:first-child{margin-top:0}
:where(.card)>h2:first-child{margin-bottom:var(--ly-space-4)}
:where(.card)>h3:first-child{margin-bottom:var(--ly-space-3)}
:where(.section-gap){margin-top:var(--ly-space-5)}
:where(.grid,.grid2,.form-grid){gap:var(--ly-space-4)}
:where(.toolbar,.top-actions,.receipt-modal-actions,.modal-title-row){gap:var(--ly-space-2)}
:where(.top){gap:var(--ly-space-3)}
:where(.top h1,.top h2){margin-block:0}
:where(.toolbar,.top-actions){min-height:40px}
:where(button,.primary,.secondary,.danger){border-radius:var(--ly-radius-sm);font-weight:680;line-height:1.25;letter-spacing:-.005em;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease,background-color .12s ease}
:where(.primary,.secondary,.danger){padding-inline:var(--ly-space-4)}
:where(.primary){box-shadow:0 1px 2px rgba(16,24,40,.08)}
@media(hover:hover){:where(button,.primary,.secondary,.danger):not(:disabled):hover{transform:translateY(-1px)}:where(.card):has(button:hover){border-color:color-mix(in srgb,var(--ly-border) 70%,var(--ly-primary) 30%)}}
:where(button,.primary,.secondary,.danger):active:not(:disabled){transform:translateY(0)}
:where(input,select,textarea){border-radius:var(--ly-radius-sm);line-height:1.35;background:#fff;border-color:var(--ly-border);transition:border-color .12s ease,box-shadow .12s ease,background-color .12s ease}
:where(input,select,textarea):focus{border-color:var(--ly-primary-border);box-shadow:0 0 0 3px var(--ly-primary-soft)}
:where(label){font-weight:650;line-height:1.4;color:#344054}
:where(.badge){font-size:var(--ly-font-xs);font-weight:720;letter-spacing:.005em;border-radius:999px}
:where(.metric){min-width:0}
:where(.metric .value){font-variant-numeric:tabular-nums;line-height:1.08;letter-spacing:-.025em;font-weight:780;color:var(--ly-text-strong)}
:where(.metric .label,.metric small){color:var(--ly-muted);font-weight:600}
:where(table){font-size:var(--ly-font-sm);border-collapse:separate;border-spacing:0}
:where(th){font-weight:720;color:#475467;background:var(--ly-surface-soft);white-space:nowrap}
:where(td,th){vertical-align:middle;border-color:var(--ly-border-soft)}
:where(tbody td){color:#344054}
:where(tbody tr){transition:background-color .1s ease}
@media(hover:hover){:where(tbody tr:hover){background:color-mix(in srgb,var(--ly-primary) 3.5%,#fff)}}
:where(td strong,td b){color:var(--ly-text-strong)}
:where(.scroll){border-radius:var(--ly-radius-sm)}
:where(.notice,.warnbox,.empty){border-radius:var(--ly-radius-md)}
:where(.notice,.warnbox){padding:var(--ly-space-3) var(--ly-space-4)}
:where(.notice){background:var(--ly-primary-soft);border-color:var(--ly-primary-border)}
:where(.warnbox){background:var(--ly-warning-soft);border-color:#fedf89}
:where(.empty){color:var(--ly-muted);text-align:center;background:linear-gradient(180deg,#fff,var(--ly-surface-soft));border-color:#dfe4ea}
:where(.modal-box){border-radius:var(--ly-radius-lg);box-shadow:var(--ly-shadow-modal);border:1px solid rgba(16,24,40,.08)}
:where(.modal-head,.modal-title-row){min-height:42px}
:where(hr){border:0;border-top:1px solid var(--ly-border-soft);margin-block:var(--ly-space-4)}
:where(code,kbd){border-radius:var(--ly-radius-xs)}
:where(a){text-underline-offset:2px}
#appVersionStatic{font-variant-numeric:tabular-nums;opacity:.84}
@media(min-width:761px){
  main{padding-block:var(--ly-space-6)}
  :where(.card){padding:var(--ly-space-5)}
  :where(.toolbar,.top-actions){align-items:center}
  :where(.grid2){column-gap:var(--ly-space-5)}
}
@media(max-width:760px){
  body{font-size:14px}
  h1{font-size:21px}h2{font-size:18px}h3{font-size:16px}
  :where(.grid,.grid2,.form-grid){gap:11px}
  :where(.card){box-shadow:none}
  :where(.top-actions,.toolbar){gap:8px}
  :where(table){font-size:13px}
  :where(.metric .value){letter-spacing:-.02em}
}
@media(max-width:430px){
  :root{--ly-space-3:10px;--ly-space-4:12px;--ly-space-5:16px;--ly-space-6:20px}
  :where(.card){border-radius:12px}
  :where(.notice,.warnbox,.empty){border-radius:10px}
  :where(.primary,.secondary,.danger){padding-inline:12px}
}
`;
  function mount(){
    let style=document.getElementById?.(STYLE_ID);
    if(!style){style=document.createElement?.('style');if(!style)return false;style.id=STYLE_ID;(document.head||document.documentElement)?.appendChild?.(style);}
    if(style.textContent!==CSS)style.textContent=CSS;
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.__lyUIDesignSystem=Object.freeze({version:VERSION,mount,status:()=>({version:VERSION,mounted:!!document.getElementById?.(STYLE_ID)})});
})();