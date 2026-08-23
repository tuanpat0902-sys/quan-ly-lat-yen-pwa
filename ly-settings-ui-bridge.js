(()=>{
  'use strict';
  if(window.__lySettingsUIBridgeV1)return;
  window.__lySettingsUIBridgeV1=true;
  const pending=[];
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
})();
