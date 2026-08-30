import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [tableView,legacyTables,app,index,employees,history,reports,cashflow,finance,specialReports,employeeReports,sw,runtime]=await Promise.all([
  fs.readFile(new URL('../ly-table-view-v2.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-ui-table-ergonomics.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-app-version.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../index.html',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-employees.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-activity-history.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-reports.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-cashflow.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-finance.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-special-reports.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-employee-reports.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../sw.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../runtime-version.json',import.meta.url),'utf8')
]);

assert.match(tableView,/VERSION='2026\.08\.30\.1'/,'Table View V2 sales native-serial version missing');
for(const key of ['suppliers','employees','activity','legacyMovements','productPerformance','cashflowCategories','cashflowHistory','financeCashflow','financeStocktake','financeSalary','financeProducts','specialImportSummary','specialImportDetails','specialImportDaily','specialExportSummary','specialExportDetails','specialExportDaily','specialSalesQuantity','recentSales','employeePerformance','recipeDirectory','stocktakeSession','stocktakeReceipt','warehouseDirectory'])assert.match(tableView,new RegExp(`${key}:Object\\.freeze`),`${key} registry contract missing`);
for(const kind of ['primary','number','date','status','long','actions'])assert.match(tableView,new RegExp(`kind:'${kind}'`),`${kind} column semantics missing`);
assert.match(tableView,/header\.cells\.length!==config\.columns\.length/,'header parity must fail closed');
assert.match(tableView,/row\.cells\.length!==config\.columns\.length/,'row parity must fail closed');
assert.match(tableView,/return reject\(table,'editable-table'\)/,'editable tables must fail closed during the read-only pilot');
assert.match(tableView,/while\(cell\.firstChild\)value\.appendChild\(cell\.firstChild\)/,'real cell nodes must move without cloning or text reconstruction');
assert.match(tableView,/while\(value\.firstChild\)cell\.insertBefore\(value\.firstChild,value\)/,'rollback must restore original cell nodes');
assert.match(tableView,/function deactivate\(key=''\)/,'public per-table rollback missing');
assert.match(tableView,/disabledKeys=new Set/,'rollback must remain disabled across later lifecycle events');
assert.match(tableView,/function activate\(key=''\)/,'explicit reactivation control missing');
assert.match(tableView,/restoreAttributes\(cell\)/,'rollback must restore original header accessibility attributes');
assert.match(tableView,/data-ly-tv2-generated-label="1"/,'rollback must remove only V2-generated header labels');
assert.match(tableView,/data-ly-tv2-shell="1"/,'styles must be scoped to V2 table shells');
assert.match(tableView,/@media\(max-width:760px\)/,'phone card presentation missing');
assert.match(tableView,/@media print/,'print must restore native table presentation');
assert.match(tableView,/latyen:panel/,'panel lifecycle refresh missing');
assert.match(tableView,/latyen:cloud-refreshed/,'cloud-render lifecycle refresh missing');
assert.match(tableView,/latyen:ui-rescued/,'UI rescue lifecycle refresh missing');
assert.doesNotMatch(tableView,/MutationObserver|setInterval|requestAnimationFrame|addEventListener\?\.\('resize'/,'V2 must not observe, poll, or rewrite on resize');
assert.doesNotMatch(tableView,/\bfetch\s*\(|\.rpc\s*\(|\.from\s*\(|renderAll|renderPanel|showTab|\.navigate\s*\(/,'V2 must remain presentation-only');
assert.doesNotMatch(tableView,/cloneNode|innerHTML\s*=|outerHTML\s*=|content:attr\(data-ly-value\)/,'V2 must preserve the single source of visible cell content');

assert.match(index,/class="supplier-directory-table" data-ly-table-view="suppliers"/,'supplier pilot marker missing');
assert.match(index,/<table data-ly-table-view="recentSales"/,'recent sales history marker missing');
assert.match(employees,/class="employee-list-table" data-ly-table-view="employees"/,'employee pilot marker missing');
assert.match(history,/class="audit-table" data-ly-table-view="activity"/,'activity pilot marker missing');
assert.match(history,/class="legacy-movement-table" data-ly-table-view="legacyMovements"/,'legacy movement marker missing');
assert.match(reports,/class="product-performance-table" data-ly-table-view="productPerformance"/,'product performance marker missing');
assert.match(cashflow,/class="cashflow-category-table" data-ly-table-view="cashflowCategories"/,'cashflow category marker missing');
assert.match(cashflow,/class="cashflow-table" data-ly-table-view="cashflowHistory"/,'cashflow history marker missing');
for(const [key,className] of [['financeCashflow','finance-cashflow-table'],['financeStocktake','finance-stocktake-table'],['financeSalary','finance-salary-table'],['financeProducts','finance-product-table']])assert.match(finance,new RegExp(`class="${className}" data-ly-table-view="${key}"`),`${key} finance marker missing`);
for(const [key,className] of [['specialImportSummary','warehouse-import-summary-table'],['specialImportDetails','warehouse-report-detail-table'],['specialImportDaily','warehouse-import-daily-table'],['specialExportSummary','warehouse-report-summary-table'],['specialExportDetails','warehouse-report-detail-table'],['specialExportDaily','warehouse-export-daily-table'],['specialSalesQuantity','sale-quantity-table']])assert.match(specialReports,new RegExp(`class="${className}" data-ly-table-view="${key}"`),`${key} special-report marker missing`);
assert.match(employeeReports,/class="employee-report-table" data-ly-table-view="employeePerformance"/,'employee performance marker missing');
assert.match(index,/class="section-gap recipe-list-table" data-ly-table-view="recipeDirectory"/,'recipeDirectory operational marker missing');
for(const key of ['stocktakeSession','stocktakeReceipt','warehouseDirectory'])assert.match(index,new RegExp(`<table data-ly-table-view="${key}"`),`${key} operational marker missing`);
assert.doesNotMatch(employeeReports,/class="payroll-table" data-ly-table-view/,'editable payroll table must remain legacy');
assert.doesNotMatch(employeeReports,/class="salary-report-table" data-ly-table-view/,'editable salary report table must remain legacy');
assert.doesNotMatch(index,/class="attendance-table[^\"]*" data-ly-table-view/,'editable attendance table must remain legacy');
for(const [source,name] of [[index,'suppliers'],[employees,'employees'],[history,'history'],[reports,'reports'],[cashflow,'cashflow'],[finance,'finance']])assert.match(source,/\(window\.queueMicrotask\|\|window\.setTimeout\)\?\.\(\(\)=>window\.__lyTableViewV2\?\.apply\?\./,`${name} renderer must explicitly settle V2 after DOM replacement with a safe scheduler fallback`);
assert.match(employeeReports,/\(window\.queueMicrotask\|\|window\.setTimeout\)\?\.\(\(\)=>window\.__lyTableViewV2\?\.apply\?\.\(area\),0\)/,'employee report renderer must explicitly settle V2');
assert.match(index,/function tv2\(root\)\{\(window\.queueMicrotask\|\|setTimeout\)\(\(\)=>window\.__lyTableViewV2\?\.apply\?\.\(root\),0\)/,'operational renderers need a bounded V2 settle helper');
for(const root of ['E\\.recipes','E\\.stocktake','E\\.warehouses','E\\.sales'])assert.match(index,new RegExp(`tv2\\(${root}\\)`),`${root} renderer must explicitly settle V2`);
assert.match(index,/if\(area\)area\.innerHTML=recentSalesTable\(\),tv2\(area\);/,'recent-sales refresh must explicitly settle V2 after DOM replacement');
assert.equal([...specialReports.matchAll(/\(window\.queueMicrotask\|\|window\.setTimeout\)\?\.\(\(\)=>window\.__lyTableViewV2\?\.apply\?\./g)].length,3,'all three special-report renderers must settle V2 after DOM replacement');
assert.match(legacyTables,/t\?\.dataset\?\.lyTv2Active==='1'/,'legacy table layer must yield only successfully activated V2 tables and retain a fallback for rejected contracts');
assert.match(app,/ly-table-view-v2\.js\?v=20260830\.1/,'V2 asset must be cache-busted');
assert.match(tableView,/function reject\(table,reason\)[\s\S]*lyTv2FallbackQueued[\s\S]*__lyUITableErgonomics\?\.apply\?\.\(table\)/,'rejected or dynamically changed explicit tables must immediately fall back to safe cards or bounded horizontal scrolling');
assert.match(app,/ensureUITableErgonomics\(\);ensureTableViewV2\(\)/,'V2 must layer after the legacy fallback owner');
assert.doesNotMatch(sw,/ly-table-view-v2\.js/,'non-critical V2 presentation must remain outside critical precache');

const release=JSON.parse(runtime);
assert.equal(release.uiBuild,'UI-2026.08.30.35');
assert.equal(release.serviceWorker,'lat-yen-fresh-core-v3-authoritative-227');
assert.match(release.tableViewV2,/wave-7-dynamic-column-rejection/);
assert.match(release.tableFirstPaint,/two-frame-atomic-panel-reveal/);

console.log('Table View V2 explicit-contract presentation boundary: PASS');
