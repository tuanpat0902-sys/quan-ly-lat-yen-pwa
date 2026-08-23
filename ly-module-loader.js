(()=>{
  'use strict';
  if(window.__lyModuleLoaderV2)return;
  window.__lyModuleLoaderV2=true;
  const VERSION='2026.08.23.2';
  const loaded=new Map();
  const HEAVY=new Set(['finance','employees','history']);
  const modules={
    settings:{src:'./ly-settings-enhancements.js?v=20260823.2',test:()=>!!window.__lyNotificationMaster},
    branding:{src:'./ly-branding-sync.js?v=20260823.2',test:()=>!!window.__lyBrandingSync},
    heavyPanels:{src:'./ly-heavy-panels.js?v=20260823.1',test:()=>!!window.__lyHeavyPanels},
  };
  function load(name){
    const m=modules[name];if(!m)return Promise.resolve(false);if(m.test?.())return Promise.resolve(true);if(loaded.has(name))return loaded.get(name);
    const p=new Promise(resolve=>{
      const s=document.createElement('script');s.src=m.src;s.async=true;s.dataset.lyModule=name;
      s.onload=()=>resolve(true);s.onerror=()=>{loaded.delete(name);resolve(false)};(document.head||document.documentElement).appendChild(s);
    });loaded.set(name,p);return p;
  }
  function panelOf(target){return target?.closest?.('#nav button[data-panel]')?.dataset?.panel||'';}
  function preparePanel(panel){
    if(panel==='settings'){load('settings');load('branding');}
    if(HEAVY.has(panel))load('heavyPanels');
  }
  document.addEventListener('pointerdown',e=>preparePanel(panelOf(e.target)),true);
  document.addEventListener('click',e=>preparePanel(panelOf(e.target)),true);
  window.addEventListener('latyen:panel',e=>preparePanel(e?.detail?.panel||''));
  function idle(){load('branding');}
  if('requestIdleCallback' in window)requestIdleCallback(idle,{timeout:6500});else setTimeout(idle,4500);
  window.__lyModuleLoader={version:VERSION,load,status:()=>({version:VERSION,loaded:[...loaded.keys()]})};
})();
