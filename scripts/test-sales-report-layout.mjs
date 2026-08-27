import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const report=await fs.readFile(new URL('../ly-special-reports.js',import.meta.url),'utf8');
const index=(await fs.readFile(new URL('../index.html',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
const bridge=await fs.readFile(new URL('../ly-special-reports-bridge.js',import.meta.url),'utf8');
const layout=await fs.readFile(new URL('../ly-compact-admin-layout.js',import.meta.url),'utf8');

assert.match(report,/class="sale-analysis-grid section-gap"/,'sales chart and table must share one responsive grid');
assert.match(report,/sale-chart-panel[\s\S]*sale-table-panel/,'chart must precede the adjacent product table');
assert.match(index,/\.sale-analysis-grid\{[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/,'sales chart and table must use balanced equal columns');
assert.match(index,/@media\(max-width:700px\)[\s\S]*\.sale-analysis-grid\{[\s\S]*grid-template-columns:1fr/,'mobile sales report must stack safely');
assert.match(report,/class="sale-chart-scroll"/,'sales chart must have a horizontal safety scroller');
assert.match(layout,/#sales \.sale-chart-scroll canvas\{width:max\(720px,100%\)!important/,'narrow screens must preserve a readable chart width');
assert.match(layout,/@media\(max-width:600px\)[\s\S]*#inlineSaleReceiptForm \.form-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/,'phone sale metadata must use a compact two-column grid');
assert.match(layout,/#sales \.inline-import-form \.sale-receipt-line\{[\s\S]*grid-template-rows:36px 36px!important/,'each phone sale item must stay within two compact control rows');
assert.match(layout,/#sales \.inline-import-form \.sale-receipt-line \.srItemDiscount\{grid-column:4!important;grid-row:2!important/,'per-item discount controls must stay on the compact second row');
assert.match(layout,/body:has\(#inlineImportReceiptForm\.open[\s\S]*#lyAssistantLauncher\{display:none!important/,'the assistant launcher must not cover an open phone business form');
assert.match(index,/ctx\.fillText\(String\(r\.name\|\|''\),left-9,cy\)/,'product labels must remain complete');
const salesChart=index.match(/function drawNativeSalesQtyChart\([\s\S]*?\n}\n\nfunction getCustomSaleSources/)?.[0]||'';
assert.doesNotMatch(salesChart,/label\.slice/,'sales product labels must not be truncated');
assert.match(index,/const LY_HORIZONTAL_CHART_BASE_HEIGHT=340/,'horizontal charts must share one base height balanced with the salary table');
assert.match(index,/function lyHorizontalChartHeight\(rowCount\)/,'horizontal charts must share one sizing function');
assert.match(salesChart,/lyHorizontalChartHeight\(rows\.length\)/,'sales chart must use the shared chart height');
assert.match(salesChart,/Math\.min\(LY_HORIZONTAL_CHART_BAR_HEIGHT,rowH\*\.48\)/,'sales bars must use the shared compact thickness');
assert.match(salesChart,/ctx\.roundRect\(left,y,barW,barH,radius\)/,'sales bars must use the shared rounded shape');
assert.match(salesChart,/getComputedStyle\(document\.body\)\.fontFamily/,'sales chart must inherit the application typeface');
assert.doesNotMatch(salesChart,/Arial/,'sales chart must not introduce a mismatched typeface');
assert.match(bridge,/ly-special-reports\.js\?v=20260827\.4/,'bridge must bypass the previous cached report module');

console.log('Sales report responsive layout: PASS');
