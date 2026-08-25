/* Lát Yên — salary fund sync with employee salary report source. */
(()=>{
  'use strict';
  if(window.__lySalaryFundSync)return;
  const VERSION='2026.08.26.1';

  const num=v=>Number(v||0);
  const isoMonth=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const dayStart=value=>{const d=new Date(value);d.setHours(0,0,0,0);return d;};
  const dayEnd=value=>{const d=new Date(value);d.setHours(23,59,59,999);return d;};
  const daysInMonth=(year,monthIndex)=>new Date(year,monthIndex+1,0).getDate();

  function activeEmployees(){
    try{return (typeof loadEmployees==='function'?loadEmployees():[]).filter(e=>e?.active!==false);}catch(e){return [];}
  }

  function reportSetting(employeeId,month){
    try{if(typeof salaryReportSetting==='function')return salaryReportSetting(employeeId,month)||{};}catch(e){}
    return {};
  }

  function attendanceMonthSalary(employee,month){
    try{return Math.max(0,num(employeeMonthlySalary(employee,month)?.total));}catch(e){return 0;}
  }

  function directMonthSalary(employee,month){
    const setting=reportSetting(employee?.id,month);
    return setting?.source==='direct'?Math.max(0,num(setting.direct_salary)):null;
  }

  function salaryReportMonthValue(employee,month){
    const direct=directMonthSalary(employee,month);
    if(direct!==null)return direct;
    try{
      if(typeof salaryReportValue==='function'){
        const value=Number(salaryReportValue(employee,month));
        if(Number.isFinite(value)&&value>=0)return value;
      }
    }catch(e){}
    return attendanceMonthSalary(employee,month);
  }

  function attendanceRangeSalary(employee,start,end,month){
    try{
      if(typeof estimatedEmployeeCostForRange==='function'){
        const result=estimatedEmployeeCostForRange(employee,start,end);
        const value=Number(result?.estimated);
        if(Number.isFinite(value)&&value>=0)return value;
      }
    }catch(e){}
    const total=attendanceMonthSalary(employee,month);
    const monthDays=daysInMonth(start.getFullYear(),start.getMonth());
    const overlap=Math.max(0,Math.floor((dayStart(end)-dayStart(start))/86400000)+1);
    return total*(overlap/monthDays);
  }

  function contribution(employee,start,end,month){
    const direct=directMonthSalary(employee,month);
    const monthDays=daysInMonth(start.getFullYear(),start.getMonth());
    const overlap=Math.max(0,Math.floor((dayStart(end)-dayStart(start))/86400000)+1);
    if(direct!==null)return direct*(overlap/monthDays);

    const fullMonth=start.getDate()===1&&end.getDate()===monthDays;
    if(fullMonth)return salaryReportMonthValue(employee,month);
    return attendanceRangeSalary(employee,start,end,month);
  }

  function monthSlices(startValue,endValue){
    const start=dayStart(startValue),end=dayEnd(endValue),out=[];
    if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>end)return out;
    let cursor=new Date(start.getFullYear(),start.getMonth(),1);
    while(cursor<=end){
      const monthStart=new Date(cursor.getFullYear(),cursor.getMonth(),1);
      const monthEnd=new Date(cursor.getFullYear(),cursor.getMonth()+1,0,23,59,59,999);
      out.push({month:isoMonth(cursor),start:new Date(Math.max(start,monthStart)),end:new Date(Math.min(end,monthEnd))});
      cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);
    }
    return out;
  }

  function financeSalaryCostInRangeSynced(startValue,endValue){
    const employees=activeEmployees(),slices=monthSlices(startValue,endValue),employeeTotals=new Map(),byMonth=[];
    let total=0;
    for(const slice of slices){
      let monthTotal=0;
      for(const employee of employees){
        const value=Math.max(0,contribution(employee,slice.start,slice.end,slice.month));
        monthTotal+=value;total+=value;
        const key=String(employee.id||employee.name||'');
        const current=employeeTotals.get(key)||{employee_id:employee.id,name:employee.name||'Nhân viên',total:0};
        current.total+=value;employeeTotals.set(key,current);
      }
      byMonth.push({month:slice.month,total:monthTotal});
    }
    return {total,byEmployee:[...employeeTotals.values()],byMonth,source:'salary-report-setting'};
  }

  function install(){
    const current=window.financeSalaryCostInRange;
    if(current?.__lySalaryFundSynced)return true;
    const wrapped=function(start,end){return financeSalaryCostInRangeSynced(start,end);};
    wrapped.__lySalaryFundSynced=true;
    wrapped.__lyOriginal=current;
    window.financeSalaryCostInRange=wrapped;
    window.salaryFundValueForMonth=(employee,month)=>salaryReportMonthValue(employee,month);
    return true;
  }

  function refreshVisibleReports(){
    try{if(document.getElementById('finance')?.classList.contains('active')&&typeof renderFinanceData==='function')renderFinanceData();}catch(e){}
  }

  function boot(){
    install();
    document.addEventListener('change',event=>{
      if(event.target?.matches?.('.salarySource,.salaryDirectValue'))setTimeout(()=>{install();refreshVisibleReports();},40);
    },true);
    window.addEventListener('latyen:cloud-refreshed',()=>setTimeout(install,60));
    setInterval(install,2500);
  }

  window.__lySalaryFundSync={version:VERSION,install,financeSalaryCostInRange:financeSalaryCostInRangeSynced,salaryReportMonthValue};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
