(()=>{
  'use strict';
  if(window.__lyUIStability?.version==='2026.08.28.4')return;

  const VERSION='2026.08.28.4';
  const STYLE_ID='lyUiStabilityStyle';
  const PROGRESS_ID='lyUiProgress';
  const CSS=`
html,body{max-width:100%;overflow-x:hidden;overflow-x:clip}
body{min-width:0;text-rendering:optimizeLegibility;-webkit-text-size-adjust:100%;text-size-adjust:100%}
main,.panel,.card,.grid,.grid2,.form-grid,.toolbar,.top,.top-actions,.scroll{min-width:0;max-width:100%}
img,svg,canvas,video{max-width:100%;height:auto}
.scroll{width:100%;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;scrollbar-gutter:stable;scrollbar-width:thin;scrollbar-color:#cbd5df transparent}
.scroll>table{min-width:max-content}
input,select,textarea,button{min-width:0;max-width:100%}
.toolbar input,.toolbar select{max-width:100%}
h1,h2,h3,.brand,.metric .value{overflow-wrap:anywhere}
button:disabled,input:disabled,select:disabled,textarea:disabled{cursor:not-allowed;opacity:.58}
:where(button,input,select,textarea,a,[tabindex]):focus-visible{outline:3px solid currentColor;outline-offset:2px}
.modal{padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));backdrop-filter:saturate(.92) blur(2px)}
.modal-box{max-width:100%;max-height:min(92dvh,calc(var(--ly-visual-vh,100dvh) - 24px));overscroll-behavior:contain;scroll-padding-bottom:24px}
.toast{max-width:min(380px,calc(100vw - 24px));right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));overflow-wrap:anywhere}
.empty{min-height:86px;display:grid;place-items:center;align-content:center;gap:6px;border:1px dashed var(--border,#e4e7ec);border-radius:12px;background:var(--card,#fff);line-height:1.5;padding:18px}
.notice,.warnbox{line-height:1.5;overflow-wrap:anywhere}
#${PROGRESS_ID}{position:fixed;z-index:9999;left:0;top:0;width:100%;height:3px;pointer-events:none;opacity:0;transform:translateY(-4px);transition:opacity .16s ease,transform .16s ease}
#${PROGRESS_ID}::before{content:'';display:block;width:34%;height:100%;border-radius:999px;background:var(--primary,#0f766e);transform:translateX(-110%);box-shadow:0 0 8px color-mix(in srgb,var(--primary,#0f766e) 35%,transparent)}
html[data-ly-ui-busy='1'] #${PROGRESS_ID}{opacity:1;transform:translateY(0)}
html[data-ly-ui-busy='1'] #${PROGRESS_ID}::before{animation:ly-ui-progress 1s ease-in-out infinite}
html[data-ly-ui-busy='1'] main{cursor:progress}
@keyframes ly-ui-progress{0%{transform:translateX(-110%)}65%{transform:translateX(185%)}100%{transform:translateX(310%)}}
.import-page-toolbar,.receipt-total-box,.modal-title-row,.receipt-modal-actions,.stocktake-session-head,.stocktake-day-head,.receipt-history-head{min-width:0;max-width:100%}
@media(prefers-reduced-motion:reduce){
  html:focus-within{scroll-behavior:auto}
  *,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  html[data-ly-ui-busy='1'] #${PROGRESS_ID}::before{width:100%;transform:none!important}
  .modal{backdrop-filter:none}
}
@media(hover:none),(pointer:coarse){
  button,.primary,.secondary,.danger,#nav button[data-panel],#nav .nav-group-toggle{min-height:44px}
  input,select,textarea{min-height:44px}
  .x{min-width:44px;min-height:44px;display:inline-grid;place-items:center}
}
@media(max-width:760px){
  header{width:100%!important;height:auto!important;min-height:0!important;max-height:none!important}
  main{width:100%!important;margin-left:0!important;padding:14px!important}
  .top,.top-actions{width:100%;min-width:0}
  .top-actions>*{min-width:0!important;max-width:100%!important}
  .toolbar{align-items:stretch}
  .toolbar input,.toolbar select{width:100%;min-width:0}
  .import-page-toolbar,.receipt-total-box,.modal-title-row,.receipt-modal-actions,.stocktake-session-head,.stocktake-day-head,.receipt-history-head{flex-wrap:wrap}
  .modal-box{width:100%;padding:14px}
  body{padding-bottom:env(safe-area-inset-bottom)}
  .scroll{scrollbar-gutter:auto}
}
@media(max-width:600px){
  input,select,textarea{font-size:16px!important}
  button{touch-action:manipulation}
  label,.muted,small,.footer-note{line-height:1.5!important}
  table td,table th{line-height:1.45!important}
  .badge{line-height:1.35}
  .toolbar>button,.receipt-modal-actions>button{min-height:44px!important}
  .empty{min-height:78px;padding:14px!important}
}
@media(max-width:430px){
  main{padding:10px!important}
  .card{padding:12px;border-radius:13px}
  .modal{padding:8px max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))}
  .modal-box{padding:12px;border-radius:14px}
  .primary,.secondary,.danger{min-height:44px}
  .recipe-line{grid-template-columns:minmax(0,1fr) minmax(70px,85px) auto}
}
`;

  function mountStyle(){let style=document.getElementById?.(STYLE_ID);if(!style){style=document.createElement?.('style');if(!style)return null;style.id=STYLE_ID;(document.head||document.documentElement)?.appendChild?.(style);}if(style.textContent!==CSS)style.textContent=CSS;return style;}
  function mountProgress(){let progress=document.getElementById?.(PROGRESS_ID);if(progress)return progress;progress=document.createElement?.('div');if(!progress)return null;progress.id=PROGRESS_ID;progress.setAttribute?.('aria-hidden','true');(document.body||document.documentElement)?.appendChild?.(progress);return progress;}
  function enhanceSemantics(){
    const toast=document.querySelector?.('.toast');
    if(toast){if(!toast.getAttribute?.('role'))toast.setAttribute?.('role','status');if(!toast.getAttribute?.('aria-live'))toast.setAttribute?.('aria-live','polite');if(!toast.getAttribute?.('aria-atomic'))toast.setAttribute?.('aria-atomic','true');}
    document.querySelectorAll?.('.modal')?.forEach?.(modal=>{if(!modal.getAttribute?.('role'))modal.setAttribute?.('role','dialog');if(!modal.getAttribute?.('aria-modal'))modal.setAttribute?.('aria-modal','true');});
    document.querySelectorAll?.('.scroll')?.forEach?.(scroll=>{if(!scroll.getAttribute?.('tabindex')&&scroll.scrollWidth>scroll.clientWidth)scroll.setAttribute?.('tabindex','0');});
  }
  let frame=0,busyTimer=0,busySince=0;
  function syncViewport(){frame=0;const height=Number(window.visualViewport?.height||window.innerHeight||0);if(height>0)document.documentElement?.style?.setProperty?.('--ly-visual-vh',`${Math.round(height)}px`);}
  function scheduleViewportSync(){if(frame)return;const raf=window.requestAnimationFrame||((fn)=>setTimeout(fn,0));frame=raf(syncViewport);}
  function clearBusy(){if(busyTimer){clearTimeout(busyTimer);busyTimer=0;}document.documentElement?.removeAttribute?.('data-ly-ui-busy');document.documentElement?.removeAttribute?.('data-ly-ui-busy-reason');document.querySelector?.('main')?.removeAttribute?.('aria-busy');}
  function setBusy(reason='ui',maxMs=1400){mountProgress();busySince=Date.now();document.documentElement?.setAttribute?.('data-ly-ui-busy','1');document.documentElement?.setAttribute?.('data-ly-ui-busy-reason',String(reason));document.querySelector?.('main')?.setAttribute?.('aria-busy','true');if(busyTimer)clearTimeout(busyTimer);busyTimer=setTimeout(clearBusy,Math.max(300,Math.min(2000,Number(maxMs)||1400)));}
  function settleBusy(){const elapsed=Date.now()-busySince;const delay=Math.max(0,120-elapsed);setTimeout(clearBusy,delay);}
  function activePanelReady(){const panel=document.querySelector?.('.panel.active');return !!(panel&&String(panel.innerHTML||'').trim());}
  function boundedStartupFeedback(){if(document.documentElement?.getAttribute?.('data-ly-ui-ready')==='1'||activePanelReady())return;setBusy('startup',1800);[120,350,800,1400,1800].forEach(ms=>setTimeout(()=>{if(document.documentElement?.getAttribute?.('data-ly-ui-ready')==='1'||activePanelReady())settleBusy();},ms));}
  function boot(){mountStyle();mountProgress();enhanceSemantics();scheduleViewportSync();boundedStartupFeedback();return true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  document.addEventListener?.('pointerdown',event=>{if(event.target?.closest?.('#nav button[data-panel]'))setBusy('navigation',1200);},true);
  window.addEventListener?.('latyen:panel',()=>{enhanceSemantics();const raf=window.requestAnimationFrame||((fn)=>setTimeout(fn,0));raf(()=>raf(()=>activePanelReady()?settleBusy():null));});
  window.addEventListener?.('latyen:ui-rescued',settleBusy);
  window.addEventListener?.('pageshow',()=>{enhanceSemantics();scheduleViewportSync();},{passive:true});
  window.addEventListener?.('orientationchange',scheduleViewportSync,{passive:true});
  window.visualViewport?.addEventListener?.('resize',scheduleViewportSync,{passive:true});
  window.__lyUIStability=Object.freeze({version:VERSION,boot,syncViewport,enhanceSemantics,setBusy,clearBusy,status:()=>({version:VERSION,styleMounted:!!document.getElementById?.(STYLE_ID),progressMounted:!!document.getElementById?.(PROGRESS_ID),busy:document.documentElement?.getAttribute?.('data-ly-ui-busy')==='1',visualHeight:document.documentElement?.style?.getPropertyValue?.('--ly-visual-vh')||''})});
})();