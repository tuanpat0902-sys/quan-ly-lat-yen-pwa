(()=>{
  'use strict';
  if(window.__lyModuleLoaderV47)return;
  window.__lyModuleLoaderV47=true;

  const VERSION='2026.08.25.49';
  const loaded=new Map();
  const HEAVY=new Set(['finance','employees','history','reports','settings','cashflow']);
  const modules={
    runtimeErrorBoundary:{src:'./ly-runtime-error-boundary.js?v=20260824.1',test:()=>window.__lyRuntimeErrorBoundary?.version==='2026.08.24.1'},
    appVersion:{src:'./ly-app-version.js?v=2.1.48',test:()=>window.__lyAppVersion?.version==='2.1.48'},
    localAssistant:{src:'./ly-local-chatbot.js?v=20260825.3',test:()=>window.__lyLocalAssistant?.version==='2026.08.25.3'},
    supabaseBootstrap:{src:'./ly-supabase-bootstrap.js?v=20260824.2',test:()=>window.__lySupabaseBootstrap?.version==='2026.08.24.2'},
    hydration:{src:'./ly-fresh-core-v2-legacy-hydration.js?v=20260824.4',test:()=>window.__lyFreshCoreV2LegacyHydration?.version==='2026.08.24.4'},
    shadow:{src:'./ly-fresh-core-v2-shadow.js?v=20260824.7',test:()=>window.__lyFreshCoreV2Shadow?.version==='2026.08.24.7'},
    domShim:{src:'./ly-legacy-dom-shim.js?v=20260824.4',test:()=>window.__lyLegacyDomShim?.version==='2026.08.24.4'},
    stateShim:{src:'./ly-legacy-state-shim.js?v=20260824.4',test:()=>window.__lyLegacyStateShim?.version==='2026.08.24.4'},
    helperShim:{src:'./ly-legacy-helper-shim.js?v=20260824.2',test:()=>window.__lyLegacyHelperShim?.version==='2026.08.24.2'},
    modelShim:{src:'./ly-legacy-model-shim.js?v=20260824.2',test:()=>window.__lyLegacyModelShim?.version==='2026.08.24.2'},
    listShim:{src:'./ly-legacy-list-shim.js?v=20260824.1',test:()=>window.__lyLegacyListShim?.version==='2026.08.24.1'},
    menuSecurity:{src:'./ly-menu-security.js?v=20260824.3',test:()=>window.__lyMenuSecurity?.version==='2026.08.24.3'},
    ingredientsTakeover:{src:'./ly-fresh-core-v2-ingredients-takeover.js?v=20260824.4',test:()=>window.__lyFreshCoreV2IngredientsTakeover?.version==='2026.08.24.4'},
    productsTakeover:{src:'./ly-fresh-core-v2-products-takeover.js?v=20260824.4',test:()=>window.__lyFreshCoreV2ProductsTakeover?.version==='2026.08.24.4'},
    documentsTakeover:{src:'./ly-fresh-core-v2-documents-takeover.js?v=20260824.3',test:()=>window.__lyFreshCoreV2DocumentsTakeover?.version==='2026.08.24.3'},
    salesTakeover:{src:'./ly-fresh-core-v2-sales-takeover.js?v=20260824.3',test:()=>window.__lyFreshCoreV2SalesTakeover?.version==='2026.08.24.3'},
    cashflowTakeover:{src:'./ly-fresh-core-v2-cashflow-takeover.js?v=20260824.3',test:()=>window.__lyFreshCoreV2CashflowTakeover?.version==='2026.08.24.3'},
    masterDataTakeover:{src:'./ly-fresh-core-v2-masterdata-takeover.js?v=20260823.5',test:()=>window.__lyFreshCoreV2MasterDataTakeover?.version==='2026.08.23.5'},
    readTakeover:{src:'./ly-fresh-core-v2-read-takeover.js?v=20260824.5',test:()=>window.__lyFreshCoreV2ReadTakeover?.version==='2026.08.24.5'},
    manualRefresh:{src:'./ly-fresh-core-v2-manual-refresh.js?v=20260824.2',test:()=>window.__lyFreshCoreV2ManualRefresh?.version==='2026.08.24.2'},
    realtime:{src:'./ly-fresh-core-v2-realtime.js?v=20260824.7',test:()=>window.__lyFreshCoreV2Realtime?.version==='2026.08.24.7'},
    realtimePhase2:{src:'./ly-fresh-core-v2-realtime-phase2.js?v=20260823.2',test:()=>window.__lyFreshCoreV2RealtimePhase2?.version==='2026.08.23.2'},
    inAppNotifications:{src:'./ly-inapp-notifications.js?v=20260824.2',test:()=>window.__lyInAppNotifications?.version==='2026.08.24.2'},
    dataNotifications:{src:'./ly-data-notifications.js?v=20260823.6',test:()=>window.__lyDataActivityNotifications?.version==='2026.08.23.6'},
    notificationCenter:{src:'./ly-notification-center.js?v=20260823.3',test:()=>window.__lyNotificationCenter?.version==='2026.08.23.3'},
    inventoryAlerts:{src:'./ly-inventory-alerts.js?v=20260824.1',test:()=>window.__lyInventoryAlerts?.version==='2026.08.24.1'},
    cloudRealtime:{src:'./ly-cloud-realtime.js?v=20260824.5',test:()=>window.__lyUnifiedCloudRealtime?.version==='2026.08.24.5'},
    finalOwnership:{src:'./ly-fresh-core-v2-final-ownership.js?v=20260824.4',test:()=>window.__lyFreshCoreV2FinalOwnership?.version==='2026.08.24.4'},
    warehouseDeleteUX:{src:'./ly-warehouse-delete-ux.js?v=20260824.3',test:()=>window.__lyWarehouseDeleteUX?.version==='2026.08.24.3'},
    settings:{src:'./ly-settings-enhancements.js?v=20260824.4',test:()=>window.__lyNotificationMaster?.version==='2026.08.24.4'},
    settingsUI:{src:'./ly-settings-ui.js?v=20260823.1',test:()=>!!window.__lySettingsUIModule},
    branding:{src:'./ly-branding-sync.js?v=20260823.2',test:()=>!!window.__lyBrandingSync},
    heavyPanels:{src:'./ly-heavy-panels.js?v=20260823.1',test:()=>!!window.__lyHeavyPanels},
    activityHistory:{src:'./ly-activity-history.js?v=20260824.2',test:()=>window.__lyActivityHistoryModule?.version==='2026.08.24.2'},
    employeesUI:{src:'./ly-employees.js?v=20260823.1',test:()=>!!window.__lyEmployeesModule},
    financeUI:{src:'./ly-finance.js?v=20260824.2',test:()=>window.__lyFinanceModule?.version==='2026.08.24.2'},
    reportsUI:{src:'./ly-reports.js?v=20260823.1',test:()=>!!window.__lyReportsModule},
    cashflowUI:{src:'./ly-cashflow.js?v=20260824.3',test:()=>window.__lyCashflowModule?.version==='2026.08.24.3'}
  };

  function load(name){
    const module=modules[name];
    if(!module)return Promise.resolve(false);
    if(module.test?.())return Promise.resolve(true);
    if(loaded.has(name))return loaded.get(name);
    const pending=new Promise(resolve=>{
      const script=document.createElement('script');
      script.src=module.src;
      script.async=true;
      script.dataset.lyModule=name;
      script.onload=()=>resolve(true);
      script.onerror=()=>{loaded.delete(name);resolve(false);};
      (document.head||document.documentElement).appendChild(script);
    });
    loaded.set(name,pending);
    return pending;
  }

  async function loadCore(){
    await load('supabaseBootstrap');
    try{await window.__lySupabaseReady;}catch(e){}
    await load('hydration');
    await load('shadow');
    await load('domShim');
    await load('stateShim');
    await load('helperShim');
    await load('modelShim');
    await load('listShim');
    await load('menuSecurity');
    await load('ingredientsTakeover');
    await load('productsTakeover');
    await load('documentsTakeover');
    await load('salesTakeover');
    await load('cashflowTakeover');
    await load('masterDataTakeover');
    await load('readTakeover');
    await load('manualRefresh');
    await load('realtime');
    await load('realtimePhase2');
    await load('inAppNotifications');
    await load('dataNotifications');
    await load('notificationCenter');
    await load('inventoryAlerts');
    await load('cloudRealtime');
    await load('finalOwnership');
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

  document.addEventListener('pointerdown',event=>preparePanel(panelOf(event.target)),true);
  document.addEventListener('click',event=>preparePanel(panelOf(event.target)),true);
  window.addEventListener('latyen:panel',event=>preparePanel(event?.detail?.panel||''));
  load('runtimeErrorBoundary');
  load('appVersion');
  load('localAssistant');
  loadCore();
  load('warehouseDeleteUX');
  setTimeout(()=>{load('runtimeErrorBoundary');load('branding');load('appVersion');load('localAssistant');loadCore();load('warehouseDeleteUX');},500);
  window.__lyModuleLoader={version:VERSION,load,loadCore,status:()=>({version:VERSION,loaded:[...loaded.keys()]})};
})();
