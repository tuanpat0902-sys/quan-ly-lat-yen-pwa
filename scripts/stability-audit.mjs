import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const ROOT=process.cwd();
let failed=false;
const fail=m=>{failed=true;console.error('FAIL:',m)};
const pass=m=>console.log('PASS:',m);
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/\r\n/g,'\n');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');

const bootstrap=[
  'ly-module-loader.js','ly-history-bridge.js','ly-employees-bridge.js','ly-finance-bridge.js',
  'ly-reports-bridge.js','ly-settings-ui-bridge.js','ly-cashflow-bridge.js',
  'ly-special-reports-bridge.js','ly-employee-reports-bridge.js'
];
const lazy=[
  'ly-activity-history.js','ly-employees.js','ly-finance.js','ly-reports.js','ly-settings-ui.js',
  'ly-cashflow.js','ly-special-reports.js','ly-employee-reports.js'
];

const mainMarker='<script>\n// ===== SUPABASE PROJECT =====';
const mainAt=html.indexOf(mainMarker);
if(mainAt<0)fail('Legacy main script marker missing');
for(const f of bootstrap){
  const tag=`src="./${f}`;
  const at=html.indexOf(tag);
  if(at<0)fail(`fresh-install HTML missing ${f}`);
  else if(mainAt>=0&&at>mainAt)fail(`${f} loads after Legacy main script`);
  else pass(`fresh-install bootstrap order ${f}`);
}
for(const f of lazy){
  if(html.includes(`src="./${f}`))fail(`heavy lazy module ${f} must not be statically executed by index.html`);
  else pass(`lazy module not statically executed: ${f}`);
}

const ctx={console,Promise,setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},queueMicrotask};
ctx.window=ctx;
ctx.self=ctx;
ctx.navigator={onLine:true};
ctx.sb={auth:{getSession:async()=>({data:{session:null},error:null})}};
ctx.location={origin:'https://example.test'};
ctx.requestIdleCallback=()=>0;
ctx.cancelIdleCallback=()=>{};
ctx.addEventListener=()=>{};
ctx.window.addEventListener=()=>{};
const scriptNodes=[];
let context;
const runFile=(file)=>vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),context,{filename:file});
ctx.document={
  readyState:'loading',
  scripts:[],
  addEventListener:()=>{},
  getElementById:()=>null,
  querySelector:()=>null,
  createElement:(tag)=>{
    const attrs={};
    return {
      tagName:String(tag).toUpperCase(),
      dataset:{},
      addEventListener:()=>{},
      setAttribute:(name,value)=>{attrs[name]=String(value);},
      getAttribute:name=>attrs[name]??null,
      removeAttribute:name=>{delete attrs[name];}
    };
  },
  head:{appendChild:(s)=>{
    if(s.tagName==='STYLE')return s;
    scriptNodes.push(s);
    const rel=String(s.src||'').replace(/^\.\//,'').split('?')[0];
    try{
      if(!rel)throw new Error('dynamic script has no src');
      runFile(rel);
      queueMicrotask(()=>s.onload?.());
    }catch(e){
      fail(`dynamic lazy script ${rel||'<unknown>'} crashed: ${e.stack||e}`);
      queueMicrotask(()=>s.onerror?.(e));
    }
    return s;
  }},
  documentElement:null
};
ctx.document.documentElement=ctx.document.head;
context=vm.createContext(ctx);

try{
  runFile('ly-module-loader.js');
  for(const f of ['ly-history-bridge.js','ly-employees-bridge.js','ly-finance-bridge.js','ly-reports-bridge.js','ly-settings-ui-bridge.js','ly-cashflow-bridge.js','ly-special-reports-bridge.js','ly-employee-reports-bridge.js'])runFile(f);

  await ctx.__lyHistoryBridge.ensure();
  await ctx.__lyEmployeesBridge.load();
  await ctx.__lyModuleLoader.load('financeUI');
  await ctx.__lyModuleLoader.load('reportsUI');
  await ctx.__lyModuleLoader.load('settingsUI');
  await ctx.__lyModuleLoader.load('cashflowUI');
  await ctx.__lySpecialReportsBridge.load();
  await ctx.__lyEmployeeReportsBridge.load();

  const markers=['__lyActivityHistoryModule','__lyEmployeesModule','__lyFinanceModule','__lyReportsModule','__lySettingsUIModule','__lyCashflowModule','__lySpecialReportsModule','__lyEmployeeReportsModule'];
  for(const m of markers){if(!ctx[m])fail(`lazy handshake missing ${m}`);else pass(`lazy handshake ${m}`);}
  const fns=['renderHistory','renderEmployees','renderFinance','renderFinanceData','renderReports','renderSettings','renderCashflow','renderCashflowReport','renderImportReport','renderExportReport','renderSaleReport','renderEmployeePayrollTable','renderEmployeeAttendance','renderEmployeeReport','renderEmployeeSalaryReport'];
  for(const n of fns){if(typeof ctx[n]!=='function')fail(`runtime function missing ${n}`);else pass(`runtime function ${n}`);}
}catch(e){fail(`VM lazy-load smoke test crashed: ${e.stack||e}`);}

if(failed){console.error('\nStability audit failed.');process.exit(1);}
console.log('\nStability audit passed.');
process.exit(0);
