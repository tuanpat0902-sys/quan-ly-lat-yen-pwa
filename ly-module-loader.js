(()=>{
  'use strict';
  if(window.__lyModuleLoaderV95)return;
  window.__lyModuleLoaderV95=true;

  const VERSION='2026.09.02.1';
  const loaded=new Map();
  const HEAVY=new Set(['finance','employees','history','reports','settings','cashflow']);
  const modules={
    tableFirstPaint:{src:'./ly-table-first-paint.js?v=20260829.2',test:()=>window.__lyTableFirstPaint?.version==='2026.08.29.2'},
    uiTableErgonomics:{src:'./ly-ui-table-ergonomics.js?v=20260830.2',test:()=>window.__lyUITableErgonomics?.version==='2026.08.30.2'},
    tableViewV2:{src:'./ly-table-view-v2.js?v=20260830.3',test:()=>window.__lyTableViewV2?.version==='2026.08.30.3'},
    runtimeErrorBoundary:{src:'./ly-runtime-error-boundary.js?v=20260824.1',test:()=>window.__lyRuntimeErrorBoundary?.version==='2026.08.24.1'},
    freshCoreV3Runtime:{src:'./ly-fresh-core-v3-runtime.js?v=20260827.6',test:()=>window.__lyFreshCoreV3Runtime?.version==='2026.08.27.6'},
    appVersion:{src:'./ly-app-version.js?v=3.0.17',test:()=>window.__lyAppVersion?.version==='3.0.17'},
    freshCoreV3ShadowSoak:{src:'./ly-fresh-core-v3-shadow-soak.js?v=20260827.2',test:()=>window.__lyFreshCoreV3ShadowSoak?.version==='2026.08.27.2'},
    freshCoreV3IngredientsInventorySoak:{src:'./ly-fresh-core-v3-ingredients-inventory-soak.js?v=20260828.4',test:()=>window.__lyFreshCoreV3IngredientsInventorySoak?.version==='2026.08.28.4'},
    freshCoreV3IngredientsInventoryValidation:{src:'./ly-fresh-core-v3-ingredients-inventory-validation.js?v=20260827.2',test:()=>window.__lyFreshCoreV3IngredientsInventoryValidation?.version==='2026.08.27.2'},
    freshCoreV3EmployeesParityRunner:{src:'./ly-fresh-core-v3-employees-parity-runner.js?v=20260828.1',test:()=>window.__lyFreshCoreV3EmployeesParityRunner?.version==='2026.08.28.1'},
    localAssistant:{src:'./ly-local-chatbot.js?v=20260826.19',test:()=>window.__lyLocalAssistant?.version==='2026.08.26.19'},
    chatLanguagePlus:{src:'./ly-chat-language-plus.js?v=20260827.5',test:()=>window.__lyChatLanguagePlus?.version==='2026.08.27.5'},
    chatLegacyInventoryUnitGuard:{src:'./ly-chat-legacy-inventory-unit-guard.js?v=20260827.1',test:()=>window.__lyChatLegacyInventoryUnitGuard?.version==='2026.08.27.1'},
    chatResponseGate:{src:'./ly-chat-response-gate.js?v=20260827.1',test:()=>window.__lyChatResponseGate?.version==='2026.08.27.1'},
    chatLocalOnly:{src:'./ly-chat-local-only.js?v=20260827.1',test:()=>window.__lyChatLocalOnly?.version==='2026.08.27.1'},
    chatUnitSync:{src:'./ly-chat-unit-sync.js?v=20260826.8',test:()=>window.__lyChatUnitSync?.version==='2026.08.26.8'},
    supabaseBootstrap:{src:'./ly-supabase-bootstrap.js?v=20260824.2',test:()=>window.__lySupabaseBootstrap?.version==='2026.08.24.2'},
    hydration:{src:'./ly-fresh-core-v2-legacy-hydration.js?v=20260824.4',test:()=>window.__lyFreshCoreV2LegacyHydration?.version==='2026.08.24.4'},
    shadow:{src:'./ly-fresh-core-v2-shadow.js?v=20260824.7',test:()=>window.__lyFreshCoreV2Shadow?.version==='2026.08.24.7'},
    domShim:{src:'./ly-legacy-dom-shim.js?v=20260824.4',test:()=>window.__lyLegacyDomShim?.version==='2026.08.24.4'},
    stateShim:{src:'./ly-legacy-state-shim.js?v=20260824.4',test:()=>window.__lyLegacyStateShim?.version==='2026.08.24.4'},
    helperShim:{src:'./ly-legacy-helper-shim.js?v=20260824.2',test:()=>window.__lyLegacyHelperShim?.version==='2026.08.24.2'},
    modelShim:{src:'./ly-legacy-model-shim.js?v=20260824.2',test:()=>window.__lyLegacyModelShim?.version==='2026.08.24.2'},
    listShim:{src:'./ly-legacy-list-shim.js?v=20260824.1',test:()=>window.__lyLegacyListShim?.version==='2026.08.24.1'},
    formDraftGuard:{src:'./ly-form-draft-guard.js?v=20260825.3',test:()=>window.__lyFormDraftGuard?.version==='2026.08.25.3'},
    menuSecurity:{src:'./ly-menu-security.js?v=20260827.4',test:()=>window.__lyMenuSecurity?.version==='2026.08.27.4'},
    ingredientsTakeover:{src:'./ly-fresh-core-v2-ingredients-takeover.js?v=20260824.4',test:()=>window.__lyFreshCoreV2IngredientsTakeover?.version==='2026.08.24.4'},
    productsTakeover:{src:'./ly-fresh-core-v2-products-takeover.js?v=20260824.4',test:()=>window.__lyFreshCoreV2ProductsTakeover?.version==='2026.08.24.4'},
    documentsTakeover:{src:'./ly-fresh-core-v2-documents-takeover.js?v=20260824.3',test:()=>window.__lyFreshCoreV2DocumentsTakeover?.version==='2026.08.24.3'},
    salesTakeover:{src:'./ly-fresh-core-v2-sales-takeover.js?v=20260824.3',test:()=>window.__lyFreshCoreV2SalesTakeover?.version==='2026.08.24.3'},
    cashflowTakeover:{src:'./ly-fresh-core-v2-cashflow-takeover.js?v=20260824.3',test:()=>window.__lyFreshCoreV2CashflowTakeover?.version==='2026.08.24.3'},
    masterDataTakeover:{src:'./ly-fresh-core-v2-masterdata-takeover.js?v=20260823.5',test:()=>window.__lyFreshCoreV2MasterDataTakeover?.version==='2026.08.23.5'},
    readTakeover:{src:'./ly-fresh-core-v2-read-takeover.js?v=20260824.5',test:()=>window.__lyFreshCoreV2ReadTakeover?.version==='2026.08.24.5'},
    manualRefresh:{src:'./ly-fresh-core-v2-manual-refresh.js?v=20260824.2',test:()=>window.__lyFreshCoreV2ManualRefresh?.version==='2026.08.24.2'},
    realtime:{src:'./ly-fresh-core-v2-realtime.js?v=20260901.3',test:()=>window.__lyFreshCoreV2Realtime?.version==='2026.09.01.3'},
    realtimePhase2:{src:'./ly-fresh-core-v2-realtime-phase2.js?v=20260823.2',test:()=>window.__lyFreshCoreV2RealtimePhase2?.version==='2026.08.23.2'},
    ingredientConversionSync:{src:'./ly-ingredient-conversion-sync.js?v=20260829.3',test:()=>window.__lyIngredientConversionSync?.version==='2026.08.29.3'},
    ingredientTableUX:{src:'./ly-ingredient-table-ux.js?v=20260830.1',test:()=>window.__lyIngredientTableUX?.version==='2026.08.30.1'},
    ingredientSidebarStatus:{src:'./ly-ingredient-sidebar-status.js?v=20260829.2',test:()=>window.__lyIngredientSidebarStatus?.version==='2026.08.29.2'},
    stockUnitSync:{src:'./ly-stock-unit-sync.js?v=20260825.1',test:()=>window.__lyStockUnitSync?.version==='2026.08.25.1'},
    salaryFundSync:{src:'./ly-salary-fund-sync.js?v=20260826.1',test:()=>window.__lySalaryFundSync?.version==='2026.08.26.1'},
    employeeTerminationDate:{src:'./ly-employee-termination-date.js?v=20260826.2',test:()=>window.__lyEmployeeTerminationDate?.version==='2026.08.26.2'},
    inAppNotifications:{src:'./ly-inapp-notifications.js?v=20260827.4',test:()=>window.__lyInAppNotifications?.version==='2026.08.27.4'},
    dataNotifications:{src:'./ly-data-notifications.js?v=20260901.1',test:()=>window.__lyDataActivityNotifications?.version==='2026.09.01.1'},
    notificationCenter:{src:'./ly-notification-center.js?v=20260829.6',test:()=>window.__lyNotificationCenter?.version==='2026.08.29.6'},
    inventoryAlerts:{src:'./ly-inventory-alerts.js?v=20260824.1',test:()=>window.__lyInventoryAlerts?.version==='2026.08.24.1'},
    performanceOptimizer:{src:'./ly-performance-optimizer.js?v=20260901.6',test:()=>window.__lyPerformanceOptimizer?.version==='2026.09.01.6'},
    cloudRealtime:{src:'./ly-cloud-realtime.js?v=20260824.5',test:()=>window.__lyUnifiedCloudRealtime?.version==='2026.08.24.5'},
    warehouseDeleteUX:{src:'./ly-warehouse-delete-ux.js?v=20260824.3',test:()=>window.__lyWarehouseDeleteUX?.version==='2026.08.24.3'},
    settingsUIBridge:{src:'./ly-settings-ui-bridge.js?v=20260827.2',test:()=>window.__lySettingsUIBridge?.version==='2026.08.27.2'},
    settings:{src:'./ly-settings-enhancements.js?v=20260828.8',test:()=>window.__lyNotificationMaster?.version==='2026.08.28.8'},
    settingsUI:{src:'./ly-settings-ui.js?v=20260823.1',test:()=>!!window.__lySettingsUIModule},
    branding:{src:'./ly-branding-sync.js?v=20260901.1',test:()=>window.__lyBrandingSync?.version==='2026.09.01.1'},
    heavyPanels:{src:'./ly-heavy-panels.js?v=20260823.1',test:()=>!!window.__lyHeavyPanels},
    activityHistory:{src:'./ly-activity-history.js?v=20260831.1',test:()=>window.__lyActivityHistoryModule?.version==='2026.08.31.1'},
    employeesUI:{src:'./ly-employees.js?v=20260830.2',test:()=>window.__lyEmployeesModule?.version==='2026.08.30.2'},
    financeUI:{src:'./ly-finance.js?v=20260825.1',test:()=>window.__lyFinanceModule?.version==='2026.08.25.1'},
    reportsUI:{src:'./ly-reports.js?v=20260823.1',test:()=>!!window.__lyReportsModule},
    cashflowUI:{src:'./ly-cashflow.js?v=20260825.2',test:()=>window.__lyCashflowModule?.version==='2026.08.25.2'}
  };

  function ensureTableFirstPaintGate(){const root=document.documentElement;root.setAttribute?.('data-ly-table-first-paint','pending');root.setAttribute?.('data-ly-table-atomic','1');let style=document.getElementById?.('lyTableFirstPaintCritical');if(!style){style=document.createElement?.('style');if(style){style.id='lyTableFirstPaintCritical';style.textContent='html[data-ly-table-first-paint="pending"] main .panel.active{visibility:hidden!important}html[data-ly-table-first-paint="pending"] main{min-height:60vh}html[data-ly-table-atomic="1"] main .panel table:not([data-ly-table-paint-ready="1"]){visibility:hidden!important}';(document.head||root).appendChild?.(style);}}setTimeout(()=>{if(root.dataset.lyTableFirstPaintOwner!=='ready'){root.removeAttribute?.('data-ly-table-first-paint');root.removeAttribute?.('data-ly-table-atomic');}},1400);return true;}

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

  async function loadAssistant(){await load('localAssistant');await load('chatLanguagePlus');await load('chatLegacyInventoryUnitGuard');await load('chatResponseGate');await load('chatLocalOnly');await load('chatUnitSync');}

  async function loadCriticalTablePresentation(){await Promise.all([load('tableFirstPaint'),load('uiTableErgonomics'),load('tableViewV2'),load('ingredientTableUX')]);window.__lyTableFirstPaint?.settle?.('critical-layers-ready');}

  function legacyShellReady(){
    return typeof window.showTab==='function'&&typeof window.renderPanel==='function'&&typeof window.navInit==='function';
  }

  async function waitForLegacyShell(timeoutMs=5000){
    if(legacyShellReady())return true;
    const started=Date.now();
    return new Promise(resolve=>{
      let done=false;
      const finish=value=>{if(done)return;done=true;resolve(value);};
      const check=()=>{
        if(legacyShellReady())return finish(true);
        if(Date.now()-started>=timeoutMs)return finish(false);
        setTimeout(check,25);
      };
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});
      setTimeout(check,0);
    });
  }

  async function loadCore(){
    await load('supabaseBootstrap');
    try{await window.__lySupabaseReady;}catch(e){}
    await waitForLegacyShell();
    await Promise.all([load('hydration'),load('shadow'),load('domShim'),load('stateShim'),load('helperShim'),load('modelShim'),load('listShim'),load('formDraftGuard')]);
    await load('freshCoreV3Runtime');
    try{await window.__lyFreshCoreV3Runtime?.boot?.();}catch(e){}
    await load('menuSecurity');await load('settingsUIBridge');
    await Promise.all([load('ingredientsTakeover'),load('productsTakeover'),load('documentsTakeover'),load('salesTakeover'),load('cashflowTakeover'),load('masterDataTakeover'),load('readTakeover'),load('manualRefresh')]);
    await Promise.all([load('realtime'),load('realtimePhase2'),load('inAppNotifications'),load('dataNotifications'),load('notificationCenter'),load('inventoryAlerts'),load('performanceOptimizer')]);
  }

  function panelOf(target){return target?.closest?.('#nav button[data-panel]')?.dataset?.panel||'';}
  async function preparePanel(panel){
    if(panel==='settings'){
      await load('settingsUIBridge');
      await load('settingsUI');
      await load('settings');
      await load('branding');
      await load('freshCoreV3EmployeesParityRunner');
      const active=document.querySelector('.panel.active')?.id||'';
      if(active==='settings'){
        try{window.renderSettings?.();}catch(e){console.warn('[Lát Yên] Settings render recovery',e);}
        try{window.__lyNotificationMaster?.refresh?.();}catch(e){}
        try{window.__lyFreshCoreV3EmployeesParityRunner?.render?.();}catch(e){}
      }
      return;
    }
    if(panel==='ingredients'){load('ingredientConversionSync');load('ingredientTableUX');load('ingredientSidebarStatus');load('stockUnitSync');}
    if(panel==='history')load('activityHistory');
    if(panel==='employees'){load('employeesUI');load('salaryFundSync');load('employeeTerminationDate');}
    if(panel==='finance'){load('financeUI');load('salaryFundSync');}
    if(panel==='reports')load('reportsUI');
    if(panel==='cashflow')load('cashflowUI');
    if(HEAVY.has(panel))load('heavyPanels');
  }

  document.addEventListener('pointerdown',event=>preparePanel(panelOf(event.target)),true);
  window.addEventListener('latyen:panel',event=>preparePanel(event?.detail?.panel||''));
  ensureTableFirstPaintGate();loadCriticalTablePresentation();load('runtimeErrorBoundary');load('appVersion');loadCore();load('warehouseDeleteUX');
  const loadBackground=()=>{load('branding');load('ingredientSidebarStatus');load('stockUnitSync');load('cloudRealtime');load('freshCoreV3ShadowSoak');load('freshCoreV3IngredientsInventorySoak');loadAssistant();};
  if(typeof requestIdleCallback==='function')requestIdleCallback(loadBackground,{timeout:1400});else setTimeout(loadBackground,900);
  setTimeout(()=>{load('runtimeErrorBoundary');load('appVersion');load('warehouseDeleteUX');},1400);
  window.__lyModuleLoader={version:VERSION,load,loadCore,loadAssistant,status:()=>({version:VERSION,loaded:[...loaded.keys()]})};
})();
