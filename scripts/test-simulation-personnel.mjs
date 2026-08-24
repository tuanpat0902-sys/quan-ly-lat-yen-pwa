import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../ly-simulation-personnel.js',import.meta.url),'utf8');
const store=new Map([['lat_yen_current_warehouse_id','e9c91d73-fa60-0749-ce2a-524b643ba054']]);
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};
const window={dispatchEvent(){}};
const context={window,localStorage,document:{readyState:'complete'},CustomEvent:class{},setTimeout};
vm.runInNewContext(source,context);
const employees=JSON.parse(store.get('lat_yen_employees_v1'));
const attendance=JSON.parse(store.get('lat_yen_employee_attendance_v1'));
const payroll=JSON.parse(store.get('lat_yen_employee_payroll_v1'));
if(employees.length!==4)throw new Error(`Expected 4 employees, got ${employees.length}`);
if(employees.filter(x=>x.role==='Nhân viên phục vụ').length!==2)throw new Error('Expected 2 service employees');
if(Object.keys(attendance).length!==28)throw new Error('Expected 28 attendance rows');
if(Object.keys(payroll).length!==4)throw new Error('Expected 4 payroll rows');
window.__lySimulationPersonnel.seed();
if(JSON.parse(store.get('lat_yen_employees_v1')).length!==4)throw new Error('Seed must be idempotent');
console.log('Simulation personnel seed: PASS');
