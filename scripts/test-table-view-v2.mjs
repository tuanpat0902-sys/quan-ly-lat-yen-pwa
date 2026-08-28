import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [tableView,legacyTables,app,index,employees,history,reports,cashflow,sw,runtime]=await Promise.all([
  fs.readFile(new URL('../ly-table-view-v2.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-ui-table-ergonomics.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-app-version.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../index.html',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-employees.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-activity-history.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-reports.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-cashflow.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../sw.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../runtime-version.json',import.meta.url),'utf8')
]);

assert.match(tableView,/VERSION='2026\.08\.28\.2'/,'Table View V2 version missing');
for(const key of ['suppliers','employees','activity','legacyMovements','productPerformance','cashflowCategories','cashflowHistory'])assert.match(tableView,new RegExp(`${key}:Object\\.freeze`),`${key} registry contract missing`);
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
assert.match(employees,/class="employee-list-table" data-ly-table-view="employees"/,'employee pilot marker missing');
assert.match(history,/class="audit-table" data-ly-table-view="activity"/,'activity pilot marker missing');
assert.match(history,/class="legacy-movement-table" data-ly-table-view="legacyMovements"/,'legacy movement marker missing');
assert.match(reports,/class="product-performance-table" data-ly-table-view="productPerformance"/,'product performance marker missing');
assert.match(cashflow,/class="cashflow-category-table" data-ly-table-view="cashflowCategories"/,'cashflow category marker missing');
assert.match(cashflow,/class="cashflow-table" data-ly-table-view="cashflowHistory"/,'cashflow history marker missing');
for(const [source,name] of [[index,'suppliers'],[employees,'employees'],[history,'history'],[reports,'reports'],[cashflow,'cashflow']])assert.match(source,/\(window\.queueMicrotask\|\|window\.setTimeout\)\?\.\(\(\)=>window\.__lyTableViewV2\?\.apply\?\./,`${name} renderer must explicitly settle V2 after DOM replacement with a safe scheduler fallback`);
assert.match(legacyTables,/t\?\.dataset\?\.lyTableView/,'legacy table layer must yield explicit V2 tables');
assert.match(app,/ly-table-view-v2\.js\?v=20260828\.2/,'V2 asset must be cache-busted');
assert.match(app,/ensureUITableErgonomics\(\);ensureTableViewV2\(\)/,'V2 must layer after the legacy fallback owner');
assert.doesNotMatch(sw,/ly-table-view-v2\.js/,'non-critical V2 presentation must remain outside critical precache');

const release=JSON.parse(runtime);
assert.equal(release.uiBuild,'UI-2026.08.28.13');
assert.equal(release.serviceWorker,'lat-yen-fresh-core-v3-authoritative-205');
assert.match(release.tableViewV2,/wave-2-suppliers-employees-activity-legacy-movements-product-performance-cashflow/);

console.log('Table View V2 explicit-contract presentation boundary: PASS');
