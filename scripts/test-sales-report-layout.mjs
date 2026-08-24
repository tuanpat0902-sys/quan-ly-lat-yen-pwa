import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const report=await fs.readFile(new URL('../ly-special-reports.js',import.meta.url),'utf8');
const index=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const bridge=await fs.readFile(new URL('../ly-special-reports-bridge.js',import.meta.url),'utf8');
const layout=await fs.readFile(new URL('../ly-compact-admin-layout.js',import.meta.url),'utf8');

assert.match(report,/class="sale-analysis-grid section-gap"/,'sales chart and table must share one responsive grid');
assert.match(report,/sale-chart-panel[\s\S]*sale-table-panel/,'chart must precede the adjacent product table');
assert.match(index,/\.sale-analysis-grid\{[\s\S]*grid-template-columns:minmax\(0,1\.05fr\) minmax\(0,\.95fr\)/,'desktop sales report must use two columns');
assert.match(index,/@media\(max-width:700px\)[\s\S]*\.sale-analysis-grid\{[\s\S]*grid-template-columns:1fr/,'mobile sales report must stack safely');
assert.match(report,/class="sale-chart-scroll"/,'sales chart must have a horizontal safety scroller');
assert.match(layout,/#sales \.sale-chart-scroll canvas\{width:max\(720px,100%\)!important/,'narrow screens must preserve a readable chart width');
assert.match(index,/ctx\.fillText\(String\(r\.name\|\|''\),left-9,cy\)/,'product labels must remain complete');
const salesChart=index.match(/function drawNativeSalesQtyChart\([\s\S]*?\n}\n\nfunction getCustomSaleSources/)?.[0]||'';
assert.doesNotMatch(salesChart,/label\.slice/,'sales product labels must not be truncated');
assert.match(bridge,/ly-special-reports\.js\?v=20260824\.3/,'bridge must bypass the previous cached report module');

console.log('Sales report responsive layout: PASS');
