(()=>{
  'use strict';
  if(window.__lyUIStability?.version==='2026.08.28.1')return;

  const VERSION='2026.08.28.1';
  const STYLE_ID='lyUiStabilityStyle';
  const CSS=`
html,body{max-width:100%;overflow-x:hidden;overflow-x:clip}
body{min-width:0}
main,.panel,.card,.grid,.grid2,.form-grid,.toolbar,.top,.top-actions,.scroll{min-width:0;max-width:100%}
img,svg,canvas,video{max-width:100%;height:auto}
.scroll{width:100%;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.scroll>table{min-width:max-content}
input,select,textarea,button{min-width:0;max-width:100%}
.toolbar input,.toolbar select{max-width:100%}
h1,h2,h3,.brand,.metric .value{overflow-wrap:anywhere}
.modal{padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}
.modal-box{max-width:100%;max-height:min(92dvh,calc(var(--ly-visual-vh,100dvh) - 24px));overscroll-behavior:contain}
.toast{max-width:min(360px,calc(100vw - 24px));right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom))}
.import-page-toolbar,.receipt-total-box,.modal-title-row,.receipt-modal-actions,.stocktake-session-head,.stocktake-day-head,.receipt-history-head{min-width:0;max-width:100%}
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
}
@media(max-width:430px){
  main{padding:10px!important}
  .card{padding:12px;border-radius:13px}
  .modal{padding:8px max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))}
  .modal-box{padding:12px;border-radius:14px}
  .primary,.secondary,.danger{min-height:42px}
  .recipe-line{grid-template-columns:minmax(0,1fr) minmax(70px,85px) auto}
}
`;

  function mountStyle(){
    let style=document.getElementById?.(STYLE_ID);
    if(style)return style;
    style=document.createElement?.('style');
    if(!style)return null;
    style.id=STYLE_ID;
    style.textContent=CSS;
    (document.head||document.documentElement)?.appendChild?.(style);
    return style;
  }

  let frame=0;
  function syncViewport(){
    frame=0;
    const height=Number(window.visualViewport?.height||window.innerHeight||0);
    if(height>0)document.documentElement?.style?.setProperty?.('--ly-visual-vh',`${Math.round(height)}px`);
  }
  function scheduleViewportSync(){
    if(frame)return;
    const raf=window.requestAnimationFrame||((fn)=>setTimeout(fn,0));
    frame=raf(syncViewport);
  }
  function boot(){mountStyle();scheduleViewportSync();return true;}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener?.('pageshow',scheduleViewportSync,{passive:true});
  window.addEventListener?.('orientationchange',scheduleViewportSync,{passive:true});
  window.visualViewport?.addEventListener?.('resize',scheduleViewportSync,{passive:true});

  window.__lyUIStability=Object.freeze({version:VERSION,boot,syncViewport,status:()=>({version:VERSION,styleMounted:!!document.getElementById?.(STYLE_ID),visualHeight:document.documentElement?.style?.getPropertyValue?.('--ly-visual-vh')||''})});
})();