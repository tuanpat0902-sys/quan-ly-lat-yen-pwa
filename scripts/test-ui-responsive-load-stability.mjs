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
assert.match(ui,/92dvh/,'modal must use dynamic viewport height');
assert.match(ui,/@media\(max-width:760px\)/,'phone breakpoint missing');
assert.match(ui,/main\{width:100%!important;margin-left:0!important/,'mobile main must not inherit desktop sidebar width');
assert.match(ui,/\.toolbar input,\.toolbar select\{width:100%;min-width:0\}/,'mobile controls must fit viewport');
assert.match(ui,/@media\(hover:none\),\(pointer:coarse\)/,'coarse-pointer ergonomics guard missing');
assert.match(ui,/min-height:44px/,'touch targets must reach the mobile target floor');
assert.match(ui,/input,select,textarea\{font-size:16px!important\}/,'iOS form controls must avoid focus auto-zoom');
assert.match(ui,/:focus-visible/,'keyboard focus visibility missing');
assert.match(ui,/prefers-reduced-motion:reduce/,'reduced-motion accessibility missing');
assert.match(ui,/role','status'/,'toast status semantics missing');
assert.match(ui,/aria-live','polite'/,'toast live-region semantics missing');
assert.match(ui,/aria-modal','true'/,'modal semantics missing');
assert.match(ui,/PROGRESS_ID='lyUiProgress'/,'non-blocking progress feedback missing');
assert.match(ui,/data-ly-ui-busy/,'busy-state visual contract missing');
assert.match(ui,/boundedStartupFeedback/,'startup perceived-performance guard missing');

assert.match(forms,/VERSION='2026\.08\.28\.2'/,'form ergonomics version missing');
assert.match(forms,/aria-invalid="true"/,'ARIA invalid fields must have explicit styling');
assert.match(forms,/@supports selector\(input:user-invalid\)/,'native user-invalid progressive enhancement missing');
assert.match(forms,/\.modal\.open \.modal-head/,'mobile modal header must be sticky');
assert.match(forms,/\.modal\.open \.receipt-modal-actions/,'mobile modal actions must be sticky');
assert.doesNotMatch(forms,/MutationObserver|setInterval/,'form ergonomics must not observe or poll the DOM');
assert.doesNotMatch(forms,/\bfetch\s*\(|\.rpc\s*\(/,'form ergonomics must not perform cloud calls');

assert.match(design,/VERSION='2026\.08\.28\.2'/,'design-system version missing');
assert.match(design,/--ly-space-1:4px/,'spacing token scale missing');
assert.match(design,/--ly-shadow-card/,'card elevation token missing');
assert.match(design,/#nav button\[data-panel\]\.active/,'active navigation hierarchy missing');
assert.doesNotMatch(design,/\bfetch\s*\(|\.rpc\s*\(/,'design system must not perform cloud calls');

assert.match(tableUx,/VERSION='2026\.08\.28\.1'/,'table ergonomics v1 must be active');
assert.match(tableUx,/\.scroll\{width:100%!important;max-width:100%!important;height:auto!important;max-height:none!important/,'table wrappers must use natural vertical page flow');
assert.match(tableUx,/\.scroll>table:not\(\.prepared-virtual-table\)\{width:100%!important;min-width:0!important;max-width:100%!important/,'desktop tables must fit their container');
assert.match(tableUx,/@media\(min-width:761px\)[\s\S]*\.scroll\{overflow-x:hidden!important\}/,'desktop table wrappers must not create routine horizontal scrolling');
assert.match(tableUx,/@media\(max-width:760px\)[\s\S]*tbody tr\{display:grid!important/,'read-only mobile tables must become row cards');
assert.match(tableUx,/data-ly-table-editable/,'editable tables must be detected and protected from row-card transforms');
assert.match(tableUx,/data-ly-label/,'mobile row cards must preserve column labels');
assert.match(tableUx,/data-ly-value/,'mobile row cards must preserve cell values');
assert.match(tableUx,/prepared-virtual-table/,'virtual tables must stay excluded from generic transforms');
assert.doesNotMatch(tableUx,/\bfetch\s*\(|\.rpc\s*\(|renderAll|renderPanel|showTab|\.navigate\s*\(/,'table ergonomics must remain presentation-only');

assert.match(sales,/VERSION='2026\.08\.28\.3'/,'sales workflow natural-height fix version missing');
assert.match(sales,/#saleReportArea \.scroll,#recentSalesArea \.scroll\{max-height:none!important;height:auto!important\}/,'sales report/history must retain natural height');
assert.doesNotMatch(sales,/MutationObserver|setInterval|\bfetch\s*\(|\.rpc\s*\(|renderSaleReport|renderAll|renderPanel|showTab|\.navigate\s*\(/,'sales workflow layer must remain presentation-only');

assert.match(recovery,/VERSION='2026\.08\.28\.1'/,'lazy render recovery version missing');
assert.doesNotMatch(recovery,/MutationObserver|setInterval|\bfetch\s*\(|\.rpc\s*\(|showTab|renderPanel|\.navigate\s*\(/,'lazy recovery must not own navigation, polling or cloud transport');

assert.match(app,/UI_BUILD='UI-2026\.08\.28\.7'/,'visible table UX overhaul marker missing');
assert.match(app,/ly-ui-stability\.js\?v=20260828\.4/,'UI stability asset must be deterministic');
assert.match(app,/ly-ui-form-ergonomics\.js\?v=20260828\.2/,'form ergonomics asset must be deterministic');
assert.match(app,/ly-ui-design-system\.js\?v=20260828\.2/,'design-system asset must be deterministic');
assert.match(app,/ly-ui-table-ergonomics\.js\?v=20260828\.1/,'table ergonomics asset must be deterministic');
assert.match(app,/ly-ui-sales-workflow\.js\?v=20260828\.3/,'sales scroll fix asset must remain deterministic');
assert.match(sw,/lat-yen-fresh-core-v3-authoritative-199/,'UI build 7 must force a fresh service-worker release');
assert.doesNotMatch(sw,/ly-ui-table-ergonomics\.js|ly-ui-design-system\.js|ly-ui-sales-workflow\.js|ly-panel-lazy-render-recovery\.js/,'non-critical presentation layers must stay outside critical precache budget');

console.log('Responsive UI + table UX overhaul + accessibility + natural page scrolling: PASS');
