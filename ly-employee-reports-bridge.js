/* Lát Yên — Employee Reports Bridge V1 */
(()=>{
  'use strict';
  if(window.__lyEmployeeReportsBridge)return;
  const VERSION='2026.08.23.1';
  let loading=null;
  function load(){
    if(window.__lyEmployeeReportsModule)return Promise.resolve(true);
    if(loading)return loading;
    loading=new Promise(resolve=>{
      const s=document.createElement('script');s.src='./ly-employee-reports.js?v=20260823.1';s.async=true;
      s.onload=()=>resolve(true);s.onerror=()=>{loading=null;resolve(false)};(document.head||document.documentElement).appendChild(s);
    });
    return loading;
  }
  function install(name){
    if(typeof window[name]==='function')return;
    const stub=function(...args){return load().then(ok=>{if(!ok)return false;const fn=window[name];if(typeof fn!=='function'||fn===stub)return false;return fn(...args);});};
    window[name]=stub;
  }
  ['renderEmployeePayrollTable','renderEmployeeAttendance','renderEmployeeReport','renderEmployeeSalaryReport'].forEach(install);
  window.__lyEmployeeReportsBridge={version:VERSION,load,status:()=>({version:VERSION,loaded:!!window.__lyEmployeeReportsModule})};
})();
