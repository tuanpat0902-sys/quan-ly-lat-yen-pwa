(()=>{
  'use strict';
  if(window.__lyEmployeesBridgeV1)return;
  window.__lyEmployeesBridgeV1=true;
  let pending=null;
  function load(){
    if(window.__lyEmployeesModule?.render)return Promise.resolve(true);
    if(window.__lyModuleLoader?.load)return window.__lyModuleLoader.load('employeesUI');
    if(pending)return pending;
    pending=new Promise(resolve=>{
      const s=document.createElement('script');
      s.src='./ly-employees.js?v=20260825.3';
      s.async=true;
      s.onload=()=>resolve(true);
      s.onerror=()=>{pending=null;resolve(false)};
      (document.head||document.documentElement).appendChild(s);
    });
    return pending;
  }
  window.renderEmployees=function(){
    if(window.__lyEmployeesModule?.render)return window.__lyEmployeesModule.render();
    load().then(ok=>{if(ok&&window.__lyEmployeesModule?.render)window.__lyEmployeesModule.render();});
  };
  window.__lyEmployeesBridge={load};
})();
