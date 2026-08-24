/* Lát Yên — deterministic personnel simulation data for the 2026-08 test set. */
(()=>{
  'use strict';
  if(window.__lySimulationPersonnelV1)return;
  window.__lySimulationPersonnelV1=true;

  const VERSION='2026.08.24.1';
  const EMPLOYEE_KEY='lat_yen_employees_v1';
  const ATTENDANCE_KEY='lat_yen_employee_attendance_v1';
  const PAYROLL_KEY='lat_yen_employee_payroll_v1';
  const AUDIT_KEY='lat_yen_audit_log_v1';
  const SEED_KEY='lat_yen_simulation_personnel_20260824_v1';
  const TARGET_WAREHOUSE='e9c91d73-fa60-0749-ce2a-524b643ba054';

  const employees=[
    {id:'sim-emp-20260824-001',code:'NV001',name:'Nguyễn Minh Anh',role:'Quản lý cửa hàng',phone:'0900 000 101',shift:'Hành chính 08:00–17:00',attendance_mode:'day',base_salary:12000000,standard_days:26,address:'Dữ liệu mô phỏng — Hà Nội',emergency_contact:'Dữ liệu mô phỏng',note:'Quản lý vận hành và kiểm soát ca.'},
    {id:'sim-emp-20260824-002',code:'NV002',name:'Trần Quốc Bảo',role:'Nhân viên pha chế',phone:'0900 000 102',shift:'Ca sáng 07:00–15:00',attendance_mode:'day',base_salary:8500000,standard_days:26,address:'Dữ liệu mô phỏng — Hà Nội',emergency_contact:'Dữ liệu mô phỏng',note:'Phụ trách pha chế và định lượng nguyên liệu.'},
    {id:'sim-emp-20260824-003',code:'NV003',name:'Lê Ngọc Mai',role:'Nhân viên phục vụ',phone:'0900 000 103',shift:'Ca sáng 07:00–13:00',attendance_mode:'hour',hourly_rate:30000,base_salary:0,standard_days:26,address:'Dữ liệu mô phỏng — Hà Nội',emergency_contact:'Dữ liệu mô phỏng',note:'Phục vụ ca sáng, tính lương theo giờ.'},
    {id:'sim-emp-20260824-004',code:'NV004',name:'Phạm Gia Hân',role:'Nhân viên phục vụ',phone:'0900 000 104',shift:'Ca chiều 14:00–22:00',attendance_mode:'hour',hourly_rate:32000,base_salary:0,standard_days:26,address:'Dữ liệu mô phỏng — Hà Nội',emergency_contact:'Dữ liệu mô phỏng',note:'Phục vụ ca chiều tối, tính lương theo giờ.'}
  ];

  function json(key,fallback){
    try{const value=JSON.parse(localStorage.getItem(key)||'');return value??fallback;}catch(e){return fallback;}
  }

  function warehouseId(){
    try{if(typeof currentWarehouseId!=='undefined'&&currentWarehouseId)return String(currentWarehouseId);}catch(e){}
    return String(localStorage.getItem('lat_yen_current_warehouse_id')||TARGET_WAREHOUSE);
  }

  function seed(){
    const wid=warehouseId();
    if(wid!==TARGET_WAREHOUSE)return false;
    const all=json(EMPLOYEE_KEY,[]);
    if(!Array.isArray(all))return false;
    const existing=new Set(all.filter(x=>x?.warehouse_id===wid).map(x=>String(x.id)));
    const now='2026-08-24T16:30:00.000Z';
    const added=[];
    for(const e of employees){
      if(existing.has(e.id))continue;
      all.push({...e,warehouse_id:wid,active:true,hire_date:'2026-08-01',bank_account:'',id_number:'',created_at:now,updated_at:now});
      added.push(e);
    }
    if(added.length)localStorage.setItem(EMPLOYEE_KEY,JSON.stringify(all));

    const attendance=json(ATTENDANCE_KEY,{});
    for(const e of employees){
      for(let day=18;day<=24;day++){
        const date=`2026-08-${String(day).padStart(2,'0')}`;
        const key=`${wid}|${e.id}|${date}`;
        if(attendance[key])continue;
        const hourly=e.attendance_mode==='hour';
        const afternoon=e.id.endsWith('004');
        const halfDay=e.id.endsWith('002')&&day===21;
        const slots=hourly?[afternoon?{start:'14:00',end:'22:00'}:{start:'07:00',end:'13:00'}]:[];
        attendance[key]={status:'work',full_day:halfDay?0.5:1,time_slots:slots,hours:hourly?(afternoon?8:6):0,overtime_slots:day===22&&!hourly?[{start:'17:00',end:'19:00'}]:[],overtime_hours:day===22&&!hourly?2:0,pay_type:'normal',pay_multiplier:1,overtime_multiplier:1.5,daily_bonus:day===24?50000:0,daily_penalty:0,note:day===24?'Ca kiểm thử dữ liệu tuần':'Dữ liệu chấm công mô phỏng',updated_at:now};
      }
    }
    localStorage.setItem(ATTENDANCE_KEY,JSON.stringify(attendance));

    const payroll=json(PAYROLL_KEY,{});
    for(const e of employees){
      const key=`${wid}|${e.id}|2026-08`;
      if(!payroll[key])payroll[key]={allowance:e.id.endsWith('001')?500000:200000,bonus:dayBonus(e.id),deduction:0,note:'Bảng lương mô phỏng tháng 08/2026',updated_at:now};
    }
    localStorage.setItem(PAYROLL_KEY,JSON.stringify(payroll));

    if(added.length){
      const audit=json(AUDIT_KEY,[]);
      for(const e of added) audit.unshift({id:`audit_sim_${e.id}`,warehouse_id:wid,warehouse_name:'Kho Lát Yên - Quầy chính',module:'Nhân viên',action:'Tạo mới',summary:`${e.code} — ${e.name}`,details:`${e.role}; ${e.shift}; dữ liệu mô phỏng`,created_at:now});
      localStorage.setItem(AUDIT_KEY,JSON.stringify(audit.slice(0,1500)));
    }
    localStorage.setItem(SEED_KEY,now);
    try{if(typeof invalidateEmployeeRuntimeCaches==='function')invalidateEmployeeRuntimeCaches();}catch(e){}
    return true;
  }

  function dayBonus(id){return id.endsWith('001')?300000:id.endsWith('002')?200000:100000;}
  function boot(attempt=0){
    if(seed()){window.dispatchEvent(new CustomEvent('latyen:personnel-seeded',{detail:{count:employees.length,version:VERSION}}));return;}
    if(attempt<20)setTimeout(()=>boot(attempt+1),250);
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>boot(),{once:true}):boot();
  window.__lySimulationPersonnel={version:VERSION,seed,employees:()=>employees.map(x=>({...x}))};
})();
