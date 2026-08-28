(()=>{
  'use strict';
  if(window.__lyUIFeedback?.version==='2026.08.28.1')return;

  const VERSION='2026.08.28.1';
  const HOST_ID='lyUiFeedback';
  const STYLE_ID='lyUiFeedbackStyle';
  const SHOW_DELAY=160;
  const SLOW_AFTER=2200;
  const HARD_STOP=5200;
  const state={panel:'',phase:'idle',startedAt:0,shows:0,slow:0,timeouts:0};
  let token=0,showTimer=0,slowTimer=0,stopTimer=0,checkTimer=0;

  const CSS=`
#${HOST_ID}{position:fixed;z-index:70;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);display:none;align-items:center;gap:9px;max-width:min(440px,calc(100vw - 24px));padding:8px 12px;border:1px solid #d9e4e2;border-radius:999px;background:rgba(255,255,255,.96);box-shadow:0 8px 24px rgba(16,24,40,.12);color:#344054;font-size:12px;font-weight:700;line-height:1.3;backdrop-filter:blur(10px);pointer-events:none}
#${HOST_ID}.show{display:flex}
#${HOST_ID}.slow{border-color:#fedf89;background:#fffcf5;color:#7a2e0e}
#${HOST_ID} .ly-ui-feedback-dot{width:9px;height:9px;flex:0 0 9px;border-radius:50%;background:var(--primary,#0f766e);animation:lyUiPulse 1s ease-in-out infinite}
#${HOST_ID}.slow .ly-ui-feedback-dot{background:#b54708}
@keyframes lyUiPulse{0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}
.empty{min-height:84px;display:flex;align-items:center;justify-content:center;border:1px dashed #d8e2e5;border-radius:10px;background:#fbfdfd;line-height:1.5;overflow-wrap:anywhere}
.notice,.warnbox{border:1px solid transparent;line-height:1.45;overflow-wrap:anywhere}
.notice{border-color:#abefc6}
.warnbox{border-color:#fedf89}
[aria-busy="true"]{cursor:progress}
@media(prefers-reduced-motion:reduce){#${HOST_ID} .ly-ui-feedback-dot{animation:none;opacity:.8}}
@media(max-width:600px){#${HOST_ID}{top:max(8px,env(safe-area-inset-top));font-size:12px;padding:8px 10px}.empty{min-height:74px;padding:14px!important}}
`;

  function mount(){
    let style=document.getElementById?.(STYLE_ID);
    if(!style){style=document.createElement?.('style');if(style){style.id=STYLE_ID;style.textContent=CSS;(document.head||document.documentElement)?.appendChild?.(style);}}
    let host=document.getElementById?.(HOST_ID);
    if(!host){
      host=document.createElement?.('div');
      if(host){
        host.id=HOST_ID;
        host.setAttribute?.('role','status');
        host.setAttribute?.('aria-live','polite');
        host.setAttribute?.('aria-atomic','true');
        host.innerHTML='<span class="ly-ui-feedback-dot" aria-hidden="true"></span><span class="ly-ui-feedback-text">Đang tải…</span>';
        (document.body||document.documentElement)?.appendChild?.(host);
      }
    }
    return host;
  }
  function panelNode(id){return id?document.getElementById?.(id):null;}
  function panelReady(id){
    const panel=panelNode(id);
    if(!panel)return false;
    if(!panel.classList?.contains?.('active'))return false;
    return !!String(panel.innerHTML||'').trim();
  }
  function clearTimers(){
    [showTimer,slowTimer,stopTimer,checkTimer].forEach(id=>{if(id)clearTimeout(id);});
    showTimer=slowTimer=stopTimer=checkTimer=0;
  }
  function hide(id=state.panel){
    clearTimers();
    const host=mount();
    host?.classList?.remove?.('show','slow');
    const panel=panelNode(id);panel?.removeAttribute?.('aria-busy');
    state.phase='idle';
  }
  function text(value){const host=mount();const label=host?.querySelector?.('.ly-ui-feedback-text');if(label)label.textContent=value;}
  function checkReady(id,myToken,attempt=0){
    if(myToken!==token)return;
    if(panelReady(id)){hide(id);return;}
    if(attempt>=10)return;
    const delays=[50,80,120,180,260,380,520,700,900,1100,1300];
    checkTimer=setTimeout(()=>checkReady(id,myToken,attempt+1),delays[Math.min(attempt,delays.length-1)]);
  }
  function begin(id){
    const panel=String(id||'').trim();
    if(!panel)return false;
    token++;const myToken=token;
    hide(state.panel);
    state.panel=panel;state.phase='pending';state.startedAt=Date.now();
    const node=panelNode(panel);node?.setAttribute?.('aria-busy','true');
    showTimer=setTimeout(()=>{
      if(myToken!==token||panelReady(panel))return hide(panel);
      const host=mount();text('Đang tải nội dung…');host?.classList?.add?.('show');state.phase='loading';state.shows++;
    },SHOW_DELAY);
    slowTimer=setTimeout(()=>{
      if(myToken!==token||panelReady(panel))return hide(panel);
      const host=mount();text('Đang tải lâu hơn bình thường…');host?.classList?.add?.('show','slow');state.phase='slow';state.slow++;
    },SLOW_AFTER);
    stopTimer=setTimeout(()=>{
      if(myToken!==token||panelReady(panel))return hide(panel);
      const host=mount();text('Nội dung chưa sẵn sàng — hệ thống vẫn đang thử khôi phục.');host?.classList?.add?.('show','slow');
      panelNode(panel)?.removeAttribute?.('aria-busy');state.phase='timeout';state.timeouts++;
      setTimeout(()=>{if(myToken===token)host?.classList?.remove?.('show','slow');},2600);
    },HARD_STOP);
    checkReady(panel,myToken,0);
    return true;
  }
  function currentPanel(){return window.__lyFreshCoreV3?.store?.getState?.()?.activePanel||document.querySelector?.('.panel.active')?.id||'';}
  function onPanel(event){begin(event?.detail?.panel||currentPanel());}
  function onReady(){const id=currentPanel();if(id&&panelReady(id))hide(id);}
  function boot(){mount();const id=currentPanel();if(id&&!panelReady(id))begin(id);}

  window.addEventListener?.('latyen:panel',onPanel);
  window.addEventListener?.('latyen:ui-rescued',onReady);
  window.addEventListener?.('pageshow',onReady,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

  window.__lyUIFeedback=Object.freeze({version:VERSION,begin,hide,status:()=>({...state})});
})();
