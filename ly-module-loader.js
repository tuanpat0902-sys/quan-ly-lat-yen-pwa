(()=>{
  'use strict';
  if(window.__lyModuleLoaderV1)return;
  window.__lyModuleLoaderV1=true;
  const VERSION='2026.08.23.1';
  const loaded=new Map();
  const modules={
    settings:{src:'./ly-settings-enhancements.js?v=20260823.2',test:()=>!!window.__lyNotificationMaster},
    branding:{src:'./ly-branding-sync.js?v=20260823.2',test:()=>!!window.__lyBrandingSync},
  };
  function load(name){
    const m=modules[name];if(!m)return Promise.resolve(false);if(m.test?.())return Promise.resolve(true);if(loaded.has(name))return loaded.get(name);
    const p=new Promise(resolve=>{
      const s=document.createElement('script');s.src=m.src;s.async=true;s.dataset.lyModule=name;
      s.onload=()=>resolve(true);s.onerror=()=>{loaded.delete(name);resolve(false)};(document.head||document.documentElement).appendChild(s);
    });loaded.set(name,p);return p;
  }
  function panelOf(target){return target?.closest?.('#nav button[data-panel]')?.dataset?.panel||'';}
  document.addEventListener('click',e=>{const panel=panelOf(e.target);if(panel==='settings'){load('settings');load('branding');}},true);
  window.addEventListener('latyen:panel',e=>{if(e?.detail?.panel==='settings'){load('settings');load('branding');}});
  function idle(){load('branding');}
  if('requestIdleCallback' in window)requestIdleCallback(idle,{timeout:5000});else setTimeout(idle,3500);
  window.__lyModuleLoader={version:VERSION,load,status:()=>({version:VERSION,loaded:[...loaded.keys()]})};
})();
