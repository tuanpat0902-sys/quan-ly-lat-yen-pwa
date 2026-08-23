(()=>{
  'use strict';
  if(window.__lyModuleLoaderV8)return;
  window.__lyModuleLoaderV8=true;
  const VERSION='2026.08.23.8';
  const loaded=new Map();
  const HEAVY=new Set(['finance','employees','history','reports','settings','cashflow']);
  const modules={
    settings:{src:'./ly-settings-enhancements.js?v=20260823.2',test:()=>!!window.__lyNotificationMaster},
    settingsUI:{src:'./ly-settings-ui.js?v=20260823.1',test:()=>!!window.__lySettingsUIModule},
    branding:{src:'./ly-branding-sync.js?v=20260823.2',test:()=>!!window.__lyBrandingSync},
    heavyPanels:{src:'./ly-heavy-panels.js?v=20260823.1',test:()=>!!window.__lyHeavyPanels},
    activityHistory:{src:'./ly-activity-history.js?v=20260823.1',test:()=>!!window.__lyActivityHistoryModule},
    employeesUI:{src:'./ly-employees.js?v=20260823.1',test:()=>!!window.__lyEmployeesModule},
    financeUI:{src:'./ly-finance.js?v=20260823.1',test:()=>!!window.__lyFinanceModule},
    reportsUI:{src:'./ly-reports.js?v=20260823.1',test:()=>!!window.__lyReportsModule},
    cashflowUI:{src:'./ly-cashflow.js?v=20260823.1',test:()=>!!window.__lyCashflowModule},
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
    if(panel==='settings'){load('settingsUI');load('settings');load('branding');}
    if(panel==='history')load('activityHistory');
    if(panel==='employees')load('employeesUI');
    if(panel==='finance')load('financeUI');
    if(panel==='reports')load('reportsUI');
    if(panel==='cashflow')load('cashflowUI');
    if(HEAVY.has(panel))load('heavyPanels');
  }
  document.addEventListener('pointerdown',e=>preparePanel(panelOf(e.target)),true);
  document.addEventListener('click',e=>preparePanel(panelOf(e.target)),true);
  window.addEventListener('latyen:panel',e=>preparePanel(e?.detail?.panel||''));
  function idle(){load('branding');}
  if('requestIdleCallback' in window)requestIdleCallback(idle,{timeout:6500});else setTimeout(idle,4500);
  window.__lyModuleLoader={version:VERSION,load,status:()=>({version:VERSION,loaded:[...loaded.keys()]})};
})();
