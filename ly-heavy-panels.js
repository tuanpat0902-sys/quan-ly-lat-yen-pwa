(()=>{
  'use strict';
  if(window.__lyHeavyPanelsV1)return;
  window.__lyHeavyPanelsV1=true;

  const VERSION='2026.08.23.1';
  const HEAVY=new Set(['finance','employees','history']);
  const state={installed:false,pendingId:'',raf:0,original:null,renders:0,coalesced:0,lastMs:0};

  function injectStyles(){
    if(document.getElementById('lyHeavyPanelStyles'))return;
    const s=document.createElement('style');
    s.id='lyHeavyPanelStyles';
    s.textContent=`
      #history .scroll,#finance .scroll,#employees .scroll{contain:layout paint style;overflow-anchor:none}
      #history .card.section-gap,#finance .card.section-gap,#employees .card.section-gap{content-visibility:auto;contain-intrinsic-size:auto 420px}
      #history .receipt-history-item,#history .stocktake-day,#history .stocktake-session{content-visibility:auto;contain-intrinsic-size:auto 110px}
      html.ly-heavy-rendering #history,html.ly-heavy-rendering #finance,html.ly-heavy-rendering #employees{cursor:progress}
      @media(prefers-reduced-motion:reduce){html.ly-heavy-rendering *{scroll-behavior:auto!important}}
    `;
    document.head.appendChild(s);
  }

  function optimizePanel(id){
    const panel=document.getElementById(id);
    if(!panel)return;
    panel.dataset.lyHeavyOptimized='1';
    panel.querySelectorAll('.scroll').forEach(el=>{
      if(!el.dataset.lyHeavyScroll){el.dataset.lyHeavyScroll='1';el.style.overscrollBehavior='contain';}
    });
  }

  function runQueued(){
    state.raf=0;
    const id=state.pendingId;
    state.pendingId='';
    if(!id||!state.original)return;
    const t=performance.now();
    document.documentElement.classList.add('ly-heavy-rendering');
    try{
      state.original.call(window,id);
      state.renders++;
      optimizePanel(id);
    }catch(e){
      console.warn('[Lát Yên] heavy panel render',e);
    }finally{
      state.lastMs=Math.max(0,performance.now()-t);
      requestAnimationFrame(()=>document.documentElement.classList.remove('ly-heavy-rendering'));
    }
  }

  function install(){
    injectStyles();
    if(state.installed)return true;
    if(typeof window.renderPanel!=='function' && typeof renderPanel!=='function')return false;
    const original=(typeof window.renderPanel==='function'?window.renderPanel:renderPanel);
    state.original=original;
    const wrapped=function(id){
      const panel=String(id||'');
      if(!HEAVY.has(panel)){
        if(state.raf){cancelAnimationFrame(state.raf);state.raf=0;state.pendingId='';}
        return original.apply(this,arguments);
      }
      if(state.raf)state.coalesced++;
      state.pendingId=panel;
      if(!state.raf)state.raf=requestAnimationFrame(runQueued);
    };
    try{window.renderPanel=wrapped;}catch(e){}
    try{renderPanel=wrapped;}catch(e){}
    state.installed=true;
    const active=document.querySelector('.panel.active')?.id;
    if(HEAVY.has(active))optimizePanel(active);
    return true;
  }

  function boot(){
    if(install())return;
    let tries=0;
    const t=setInterval(()=>{tries++;if(install()||tries>20)clearInterval(t);},250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.__lyHeavyPanels={
    version:VERSION,
    install,
    optimize:optimizePanel,
    status:()=>({version:VERSION,installed:state.installed,renders:state.renders,coalesced:state.coalesced,lastMs:Math.round(state.lastMs)})
  };
})();
