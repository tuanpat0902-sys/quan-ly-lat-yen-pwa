import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, join } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const INDEX_MAX_BYTES = 1_500_000;
const required = [
  'index.html','sw.js','manifest.webmanifest','icon.svg','ly-runtime-error-boundary.js','ly-module-loader.js',
  'ly-history-bridge.js','ly-activity-history.js','ly-employees-bridge.js','ly-employees.js',
  'ly-finance-bridge.js','ly-finance.js','ly-reports-bridge.js','ly-reports.js','ly-settings-ui-bridge.js','ly-settings-ui.js',
  'ly-cashflow-bridge.js','ly-cashflow.js','ly-special-reports-bridge.js','ly-special-reports.js','ly-employee-reports-bridge.js','ly-employee-reports.js',
  'ly-data-notifications.js','ly-inapp-notifications.js','ly-notification-center.js','ly-inventory-alerts.js',
  'ly-cloud-realtime.js','ly-menu-security.js','ly-performance-optimizer.js','ly-heavy-panels.js','ly-compact-admin-layout.js','ly-unit-conversions.js'
];
let failed=false;
function fail(message){failed=true;console.error(`FAIL: ${message}`)}
function ok(message){console.log(`PASS: ${message}`)}
for(const file of required){const p=join(ROOT,file);if(!existsSync(p))fail(`missing ${file}`);else ok(`found ${file}`)}

if(existsSync(join(ROOT,'index.html'))){
  const indexPath=join(ROOT,'index.html'),size=statSync(indexPath).size,html=readFileSync(indexPath,'utf8');
  console.log(`INFO: index.html ${(size/1024).toFixed(1)} KiB (${size} bytes)`);
  if(size>INDEX_MAX_BYTES)fail(`index.html exceeds ${(INDEX_MAX_BYTES/1024).toFixed(0)} KiB safety ceiling`);else ok('index.html is inside safety ceiling');
  for(const fn of ['auditActionClass','auditFilterRows','renderHistory','renderEmployees','renderFinance','renderFinanceData','renderReports','renderSettings','renderCashflow','renderCashflowReport','renderImportReport','renderExportReport','renderSaleReport','renderEmployeePayrollTable','renderEmployeeAttendance','renderEmployeeReport','renderEmployeeSalaryReport'])if(new RegExp(`\\bfunction\\s+${fn}\\s*\\(`).test(html))fail(`index.html still contains extracted ${fn}()`);
  for(const kept of ['compactAuditRows','loadAuditLog','saveAuditLog','auditLog','debouncedHistoryRender','loadEmployees','bindEmployeeActions','financeInventorySnapshot','financeInventoryPeriod','financeSalesInRange','financeSalaryCostInRange','financeCashflowInRange','drawFinanceTrend','drawReportCharts','migrateV2ToCloud','isInventoryPurchaseCashflow','formatVNDate','addExportReceiptLine','drawSaleReportCharts','previewPayrollRow','toggleAttendanceEmployee','drawEmployeeWorkChart','toggleSalaryReportSource'])if(!new RegExp(`\\bfunction\\s+${kept}\\s*\\(`).test(html))fail(`index.html lost required core ${kept}()`);
  const scripts=html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi);
  let inlineIndex=0;
  for(const match of scripts){
    const attrs=match[1]||'',source=match[2]||'';
    const id=attrs.match(/\bid=["']([^"']+)["']/i)?.[1]||`inline-${inlineIndex}`;
    inlineIndex++;
    if(/\bsrc\s*=/i.test(attrs)||/\btype=["']module["']/i.test(attrs)||!source.trim())continue;
    try{new vm.Script(source,{filename:`index.html#${id}`})}
    catch(error){fail(`index.html script ${id} syntax check failed`);console.error(String(error?.stack||error))}
  }
  if(!failed)ok('index.html inline script syntax');
  if(!failed)ok('Lazy UI extraction is intact while data/calculation/migration cores stay resident');
}

const rootFiles=readdirSync(ROOT,{withFileTypes:true}).filter(e=>e.isFile()&&e.name.endsWith('.js')).map(e=>e.name).sort();
for(const file of rootFiles){const r=spawnSync(process.execPath,['--check',join(ROOT,file)],{encoding:'utf8'});if(r.status!==0){fail(`${file} syntax check failed`);if(r.stderr)console.error(r.stderr.trim())}else ok(`${file} syntax`)}
if(existsSync(join(ROOT,'ly-module-loader.js'))){
  const loader=readFileSync(join(ROOT,'ly-module-loader.js'),'utf8');
  for(const marker of ['heavyPanels','finance','employees','history','reports','settings','cashflow','activityHistory','employeesUI','financeUI','reportsUI','settingsUI','cashflowUI','ly-activity-history.js','ly-employees.js','ly-finance.js','ly-reports.js','ly-settings-ui.js','ly-cashflow.js'])if(!loader.includes(marker))fail(`module loader missing ${marker}`);
  if(!failed)ok('module loader lazy UI wiring');
}
if(existsSync(join(ROOT,'sw.js'))){
  const sw=readFileSync(join(ROOT,'sw.js'),'utf8');
  for(const asset of ['ly-runtime-error-boundary.js','ly-module-loader.js','ly-history-bridge.js','ly-activity-history.js','ly-employees-bridge.js','ly-employees.js','ly-finance-bridge.js','ly-finance.js','ly-reports-bridge.js','ly-reports.js','ly-settings-ui-bridge.js','ly-settings-ui.js','ly-cashflow-bridge.js','ly-cashflow.js','ly-special-reports-bridge.js','ly-special-reports.js','ly-employee-reports-bridge.js','ly-employee-reports.js','ly-heavy-panels.js','ly-menu-security.js','ly-performance-optimizer.js','ly-compact-admin-layout.js','ly-unit-conversions.js','ly-inventory-alerts.js'])if(!sw.includes(asset))fail(`service worker does not reference ${asset}`);
  for(const full of ['ly-activity-history.js','ly-employees.js','ly-finance.js','ly-reports.js','ly-settings-ui.js','ly-cashflow.js','ly-special-reports.js','ly-employee-reports.js'])if(new RegExp(`scripts\\.push\\([^\\n]*${full.replace('.','\\.')}`).test(sw))fail(`${full} must not be injected at startup`);
  const cache=sw.match(/const CACHE='([^']+)'/)?.[1];if(!cache)fail('service worker cache version not found');else console.log(`INFO: service worker cache ${cache}`);
}

const clientFiles=['index.html',...rootFiles];
const privateKeyPatterns=[/SUPABASE_SERVICE_ROLE_KEY\s*=/i,/service_role\s*:\s*['"][A-Za-z0-9._-]{20,}/i];
for(const file of clientFiles){const p=join(ROOT,file);if(!existsSync(p))continue;const text=readFileSync(p,'utf8');for(const pattern of privateKeyPatterns)if(pattern.test(text))fail(`possible service-role secret in client file ${basename(file)}`)}
if(!failed)ok('no obvious service-role secret in client runtime files');
if(failed){console.error('\nProduction validation failed. Deployment must stop.');process.exit(1)}
console.log('\nProduction validation passed.');
