import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const ui=await fs.readFile(new URL('../ly-ui-stability.js',import.meta.url),'utf8');
const forms=await fs.readFile(new URL('../ly-ui-form-ergonomics.js',import.meta.url),'utf8');
const design=await fs.readFile(new URL('../ly-ui-design-system.js',import.meta.url),'utf8');
const tableUx=await fs.readFile(new URL('../ly-ui-table-ergonomics.js',import.meta.url),'utf8');
const sales=await fs.readFile(new URL('../ly-ui-sales-workflow.js',import.meta.url),'utf8');
const recovery=await fs.readFile(new URL('../ly-panel-lazy-render-recovery.js',import.meta.url),'utf8');
const app=await fs.readFile(new URL('../ly-app-version.js',import.meta.url),'utf8');
const sw=await fs.readFile(new URL('../sw.js',import.meta.url),'utf8');
const index=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');

assert.match(index,/viewport-fit=cover/,'mobile viewport must keep safe-area support');
assert.match(ui,/VERSION='2026\.08\.28\.4'/,'UI stability v4 must be active');
assert.match(ui,/overflow-x:hidden;overflow-x:clip/,'global horizontal overflow guard missing');
assert.match(ui,/min-width:0;max-width:100%/,'flex/grid shrink guard missing');
assert.match(ui,/safe-area-inset-bottom/,'Safari safe-area handling missing');
assert.match(ui,/visualViewport/,'dynamic mobile viewport normalization missing');
assert.match(ui,/@media\(max-width:760px\)/,'phone breakpoint missing');
assert.match(ui,/min-height:44px/,'touch targets must reach the mobile target floor');
assert.match(ui,/:focus-visible/,'keyboard focus visibility missing');
assert.match(ui,/prefers-reduced-motion:reduce/,'reduced-motion accessibility missing');

assert.match(forms,/VERSION='2026\.08\.28\.2'/,'form ergonomics version missing');
assert.match(forms,/aria-invalid="true"/,'ARIA invalid fields must have explicit styling');
assert.doesNotMatch(forms,/MutationObserver|setInterval/,'form ergonomics must not observe or poll the DOM');
assert.doesNotMatch(forms,/\bfetch\s*\(|\.rpc\s*\(/,'form ergonomics must not perform cloud calls');

assert.match(design,/VERSION='2026\.08\.28\.2'/,'design-system version missing');
assert.match(design,/#nav button\[data-panel\]\.active/,'active navigation hierarchy missing');
assert.doesNotMatch(design,/\bfetch\s*\(|\.rpc\s*\(/,'design system must not perform cloud calls');

assert.match(tableUx,/VERSION='2026\.08\.28\.5'/,'table ergonomics v5 must be active');
assert.match(tableUx,/LONG_TABLE_ROWS=12/,'long-table threshold must stay bounded');
assert.match(tableUx,/table-layout:fixed!important/,'table columns must use a stable fixed layout');
assert.match(tableUx,/contain:layout paint/,'table wrappers must contain layout and paint shifts');
assert.match(tableUx,/function boot\(\)\{const tables=collect\(document\);tables\.forEach\(enhance\);mountStyle\(\);return true;\}/,'initial table metadata must be prepared before CSS mounts');
assert.match(tableUx,/latyen:panel/,'table refresh must follow renderer lifecycle');
assert.match(tableUx,/latyen:cloud-refreshed/,'table refresh must follow cloud render lifecycle');
assert.match(tableUx,/latyen:ui-rescued/,'table refresh must follow UI rescue lifecycle');
assert.match(tableUx,/\.scroll\[data-ly-table-shell="1"\]\[data-ly-table-long="1"\]\{max-height:min\(68vh,680px\)!important;overflow-y:auto!important/,'long tables must keep bounded vertical scrolling');
assert.match(tableUx,/@media\(min-width:761px\)[\s\S]*thead th\{position:sticky!important;top:0!important/,'desktop long tables must keep headers visible');
assert.match(tableUx,/@media\(max-width:760px\)[\s\S]*tbody tr\{display:block!important/,'read-only mobile tables must remain row cards');
assert.match(tableUx,/\.scroll\[data-ly-table-shell="1"\]/,'generic scroll containers must not receive table styling');
assert.match(tableUx,/lyTableComplex/,'complex tables must retain their native table structure');
assert.match(tableUx,/data-ly-table-wide/,'editable and complex tables must receive bounded horizontal scrolling');
assert.doesNotMatch(tableUx,/content:attr\(data-ly-value\)/,'mobile cards must preserve real cell content without duplicating text');
assert.match(tableUx,/lyTableEditable/,'editable tables must remain protected');
assert.match(tableUx,/prepared-virtual-table/,'virtual tables must stay excluded');
assert.doesNotMatch(tableUx,/MutationObserver|\[80,300,900,1800\]|requestAnimationFrame|setInterval|window\.addEventListener\?\.\('resize'/,'table layer must not add observers, retry timers or resize-driven rewrites');
assert.doesNotMatch(tableUx,/\bfetch\s*\(|\.rpc\s*\(|renderAll|renderPanel|showTab|\.navigate\s*\(/,'table ergonomics must remain presentation-only');

assert.match(sales,/VERSION='2026\.08\.28\.3'/,'sales workflow fix version missing');
assert.doesNotMatch(sales,/MutationObserver|setInterval|\bfetch\s*\(|\.rpc\s*\(/,'sales workflow layer must remain bounded');
assert.match(recovery,/VERSION='2026\.08\.28\.1'/,'lazy recovery version missing');

assert.match(app,/UI_BUILD='UI-2026\.08\.28\.14'/,'visible Table View V2 finance wave marker missing');
assert.match(app,/ly-ui-table-ergonomics\.js\?v=20260828\.5/,'table ergonomics asset must be deterministic');
assert.match(sw,/lat-yen-fresh-core-v3-authoritative-206/,'UI build 14 must force a fresh service-worker release');
assert.doesNotMatch(sw,/ly-ui-table-ergonomics\.js|ly-ui-design-system\.js|ly-ui-sales-workflow\.js|ly-panel-lazy-render-recovery\.js/,'non-critical presentation layers must stay outside critical precache budget');

console.log('Responsive UI + stable first-paint table layout + bounded long-table scrolling: PASS');
