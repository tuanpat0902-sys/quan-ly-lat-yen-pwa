(()=>{
  'use strict';
  if(window.__lySettingsUIBridgeV2)return;
  window.__lySettingsUIBridgeV2=true;
  const pending=[];
  const VERSION='2026.08.27.2';
  function ensure(){
    if(window.__lySettingsUIModule?.renderSettings)return Promise.resolve(true);
    if(window.__lyModuleLoader?.load)return window.__lyModuleLoader.load('settingsUI');
    return Promise.resolve(false);
  }
  window.renderSettings=function(){
    const args=arguments;
    if(window.__lySettingsUIModule?.renderSettings)return window.__lySettingsUIModule.renderSettings.apply(window,args);
    pending.push(args);
    ensure().then(ok=>{
      if(!ok||!window.__lySettingsUIModule?.renderSettings)return;
      while(pending.length)window.__lySettingsUIModule.renderSettings.apply(window,pending.shift());
    });
  };
  window.__lySettingsUIBridge={version:VERSION,ensure,status:()=>({version:VERSION,pending:pending.length,ready:!!window.__lySettingsUIModule?.renderSettings})};
})();
