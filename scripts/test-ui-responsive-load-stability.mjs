import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const ui=await fs.readFile(new URL('../ly-ui-stability.js',import.meta.url),'utf8');
const forms=await fs.readFile(new URL('../ly-ui-form-ergonomics.js',import.meta.url),'utf8');
const design=await fs.readFile(new URL('../ly-ui-design-system.js',import.meta.url),'utf8');
const sales=await fs.readFile(new URL('../ly-ui-sales-workflow.js',import.meta.url),'utf8');
const app=await fs.readFile(new URL('../ly-app-version.js',import.meta.url),'utf8');
const sw=await fs.readFile(new URL('../sw.js',import.meta.url),'utf8');
const index=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');

assert.match(index,/viewport-fit=cover/,'mobile viewport must keep safe-area support');
assert.match(ui,/VERSION='2026\.08\.28\.3'/,'UI stability v3 must be active');
assert.match(ui,/overflow-x:hidden;overflow-x:clip/,'global horizontal overflow guard missing');
assert.match(ui,/safe-area-inset-bottom/,'Safari safe-area handling missing');
assert.match(ui,/visualViewport/,'dynamic mobile viewport normalization missing');
assert.match(ui,/92dvh/,'modal must use dynamic viewport height');
assert.match(ui,/@media\(hover:none\),\(pointer:coarse\)/,'coarse-pointer ergonomics guard missing');
assert.match(ui,/min-height:44px/,'touch targets must reach the mobile target floor');
assert.match(ui,/input,select,textarea\{font-size:16px!important\}/,'iOS form controls must avoid focus auto-zoom');
assert.match(ui,/:focus-visible/,'keyboard focus visibility missing');
assert.match(ui,/prefers-reduced-motion:reduce/,'reduced-motion accessibility missing');
assert.match(ui,/PROGRESS_ID='lyUiProgress'/,'non-blocking progress feedback missing');
assert.match(ui,/data-ly-ui-busy/,'busy-state visual contract missing');
assert.match(ui,/boundedStartupFeedback/,'startup perceived-performance guard missing');
assert.match(forms,/VERSION='2026\.08\.28\.1'/,'form ergonomics version missing');
assert.match(forms,/aria-invalid="true"/,'ARIA invalid fields must have explicit styling');
assert.match(forms,/\.modal\.open \.receipt-modal-actions/,'mobile modal actions must be sticky');
assert.doesNotMatch(forms,/MutationObserver|setInterval|\bfetch\s*\(|\.rpc\s*\(/,'form ergonomics must remain presentation-only');
assert.match(design,/VERSION='2026\.08\.28\.1'/,'design-system version missing');
assert.match(design,/--ly-space-1:4px/,'spacing token scale missing');
assert.match(design,/--ly-font-xs:12px/,'typography token scale missing');
assert.match(design,/#nav button\[data-panel\]\.active/,'active navigation hierarchy missing');
assert.doesNotMatch(design,/MutationObserver|setInterval|\bfetch\s*\(|\.rpc\s*\(/,'design system must remain presentation-only');

assert.match(sales,/VERSION='2026\.08\.28\.1'/,'sales workflow UI version missing');
assert.match(sales,/#saleReportArea \.sale-qty-summary/,'sales KPI grid normalization missing');
assert.match(sales,/data-ly-sales-revenue-card/,'revenue-first sales hierarchy missing');
assert.match(sales,/@media\(max-width:430px\)/,'small-phone sales workflow guard missing');
assert.doesNotMatch(sales,/MutationObserver|setInterval|\bfetch\s*\(|\.rpc\s*\(|renderSaleReport|renderPanel|showTab/,'sales workflow layer must not own data or rendering');

assert.match(app,/UI_BUILD='UI-2026\.08\.28\.2'/,'visible UI build marker missing');
assert.match(app,/ensureUISalesWorkflow/,'sales workflow layer must be bootstrapped');
assert.match(app,/ly-ui-sales-workflow\.js\?v=20260828\.1/,'sales workflow asset version must be deterministic');
assert.match(sw,/lat-yen-fresh-core-v3-authoritative-194/,'UI build must force a fresh service worker release');
assert.doesNotMatch(sw,/ly-ui-design-system\.js|ly-ui-sales-workflow\.js/,'non-critical presentation layers must stay outside critical precache budget');

console.log('Responsive UI + accessibility + design system + sales workflow UI build: PASS');