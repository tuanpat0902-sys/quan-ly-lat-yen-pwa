import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const ui=await fs.readFile(new URL('../ly-ui-stability.js',import.meta.url),'utf8');
const forms=await fs.readFile(new URL('../ly-ui-form-ergonomics.js',import.meta.url),'utf8');
const design=await fs.readFile(new URL('../ly-ui-design-system.js',import.meta.url),'utf8');
const sales=await fs.readFile(new URL('../ly-ui-sales-workflow.js',import.meta.url),'utf8');
const recovery=await fs.readFile(new URL('../ly-panel-lazy-render-recovery.js',import.meta.url),'utf8');
const app=await fs.readFile(new URL('../ly-app-version.js',import.meta.url),'utf8');
const sw=await fs.readFile(new URL('../sw.js',import.meta.url),'utf8');
const index=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');

assert.match(index,/viewport-fit=cover/,'mobile viewport must keep safe-area support');
assert.match(ui,/VERSION='2026\.08\.28\.3'/,'UI stability v3 must be active');
assert.match(ui,/overflow-x:hidden;overflow-x:clip/,'global horizontal overflow guard missing');
assert.match(ui,/min-width:0;max-width:100%/,'flex/grid shrink guard missing');
assert.match(ui,/safe-area-inset-bottom/,'Safari safe-area handling missing');
assert.match(ui,/visualViewport/,'dynamic mobile viewport normalization missing');
assert.match(ui,/92dvh/,'modal must use dynamic viewport height');
assert.match(ui,/@media\(max-width:760px\)/,'phone breakpoint missing');
assert.match(ui,/main\{width:100%!important;margin-left:0!important/,'mobile main must not inherit desktop sidebar width');
assert.match(ui,/\.toolbar input,\.toolbar select\{width:100%;min-width:0\}/,'mobile controls must fit viewport');
assert.match(ui,/\.scroll>table\{min-width:max-content\}/,'wide tables must scroll inside their container');
assert.match(ui,/@media\(hover:none\),\(pointer:coarse\)/,'coarse-pointer ergonomics guard missing');
assert.match(ui,/min-height:44px/,'touch targets must reach the mobile target floor');
assert.match(ui,/input,select,textarea\{font-size:16px!important\}/,'iOS form controls must avoid focus auto-zoom');
assert.match(ui,/:focus-visible/,'keyboard focus visibility missing');
assert.match(ui,/prefers-reduced-motion:reduce/,'reduced-motion accessibility missing');
assert.match(ui,/role','status'/,'toast status semantics missing');
assert.match(ui,/aria-live','polite'/,'toast live-region semantics missing');
assert.match(ui,/aria-modal','true'/,'modal semantics missing');
assert.match(ui,/if\(style\.textContent!==CSS\)style\.textContent=CSS/,'hot-loaded UI layer must replace stale CSS safely');
assert.match(ui,/PROGRESS_ID='lyUiProgress'/,'non-blocking progress feedback missing');
assert.match(ui,/data-ly-ui-busy/,'busy-state visual contract missing');
assert.match(ui,/aria-busy','true'/,'main content must expose bounded busy semantics');
assert.match(ui,/Math\.min\(2000/,'busy feedback must have a hard timeout');
assert.match(ui,/boundedStartupFeedback/,'startup perceived-performance guard missing');
assert.match(ui,/latyen:ui-rescued/,'UI rescue must settle perceived loading state');
assert.match(ui,/\.empty\{min-height:/,'empty-state readability normalization missing');

assert.match(forms,/VERSION='2026\.08\.28\.1'/,'form ergonomics version missing');
assert.match(forms,/aria-invalid="true"/,'ARIA invalid fields must have explicit styling');
assert.match(forms,/@supports selector\(input:user-invalid\)/,'native user-invalid progressive enhancement missing');
assert.match(forms,/\[role="alert"\]/,'inline form errors need readable alert styling');
assert.match(forms,/\.modal\.open \.modal-head/,'mobile modal header must be sticky');
assert.match(forms,/\.modal\.open \.receipt-modal-actions/,'mobile modal actions must be sticky');
assert.match(forms,/safe-area-inset-bottom/,'sticky mobile actions must respect bottom safe area');
assert.match(forms,/min-height:44px/,'mobile modal actions must keep touch targets');
assert.doesNotMatch(forms,/MutationObserver|setInterval/,'form ergonomics must not observe or poll the DOM');
assert.doesNotMatch(forms,/\bfetch\s*\(|\.rpc\s*\(/,'form ergonomics must not perform cloud calls');
assert.doesNotMatch(forms,/renderAll|renderPanel|showTab|\.navigate\s*\(/,'form ergonomics must not own renderer/navigation');

assert.match(design,/VERSION='2026\.08\.28\.1'/,'design-system version missing');
assert.match(design,/--ly-space-1:4px/,'spacing token scale missing');
assert.match(design,/--ly-radius-sm:8px/,'radius token scale missing');
assert.match(design,/--ly-font-xs:12px/,'typography token scale missing');
assert.match(design,/--ly-shadow-card/,'card elevation token missing');
assert.match(design,/:where\(\.card\)/,'card anatomy normalization missing');
assert.match(design,/:where\(button,\.primary,\.secondary,\.danger\)/,'button hierarchy normalization missing');
assert.match(design,/:where\(table\)\{font-size:var\(--ly-font-sm\)/,'table density normalization missing');
assert.match(design,/#nav button\[data-panel\]\.active/,'active navigation hierarchy missing');
assert.match(design,/@media\(max-width:430px\)/,'small-phone density tokens missing');
assert.doesNotMatch(design,/MutationObserver|setInterval/,'design system must not observe or poll DOM');
assert.doesNotMatch(design,/\bfetch\s*\(|\.rpc\s*\(/,'design system must not perform cloud calls');
assert.doesNotMatch(design,/renderAll|renderPanel|showTab|\.navigate\s*\(/,'design system must not own renderer/navigation');

assert.match(sales,/VERSION='2026\.08\.28\.2'/,'sales workflow hotfix version missing');
assert.match(sales,/data-ly-sales-revenue-card/,'revenue emphasis must remain');
assert.match(sales,/layoutOwnership:false/,'sales UI must explicitly report no layout ownership');
assert.doesNotMatch(sales,/\.sale-qty-summary\{display:grid|\.sale-qty-summary\{grid-template-columns/,'sales UI must preserve native quantity-statistics layout');
assert.doesNotMatch(sales,/#saleReportArea table td|#saleReportArea table th|#saleReportArea \.toolbar/,'sales UI must not override history/table/filter layout');
assert.doesNotMatch(sales,/MutationObserver|setInterval|\bfetch\s*\(|\.rpc\s*\(|renderSaleReport|renderAll|renderPanel|showTab|\.navigate\s*\(/,'sales workflow layer must remain presentation-only');

assert.match(recovery,/VERSION='2026\.08\.28\.1'/,'lazy render recovery version missing');
assert.match(recovery,/load\?\.\('activityHistory'\)/,'history recovery must use the module loader first');
assert.match(recovery,/activePanel\(\)!=='history'/,'history recovery must fail closed when user navigated away');
assert.match(recovery,/ly-special-reports-bridge\.js\?v=20260827\.2/,'sales recovery must load the exact report bridge');
assert.match(recovery,/__lySpecialReportsBridge\?\.load\?\.\(\)/,'sales recovery must await special reports');
assert.match(recovery,/activePanel\(\)!=='sales'/,'sales recovery must fail closed when user navigated away');
assert.match(recovery,/renderHistory\?\.\(\)/,'history must render after module readiness');
assert.match(recovery,/renderSaleReport\?\.\(\)/,'sales quantity report must render after report readiness');
assert.doesNotMatch(recovery,/MutationObserver|setInterval|\bfetch\s*\(|\.rpc\s*\(|showTab|renderPanel|\.navigate\s*\(/,'lazy recovery must not own navigation, polling or cloud transport');

assert.match(app,/UI_BUILD='UI-2026\.08\.28\.4'/,'visible lazy-render recovery marker missing');
assert.match(app,/ly-panel-lazy-render-recovery\.js\?v=20260828\.1/,'lazy recovery asset must be deterministic');
assert.match(sw,/lat-yen-fresh-core-v3-authoritative-196/,'lazy-render recovery must force a fresh service-worker release');
assert.doesNotMatch(sw,/ly-ui-design-system\.js|ly-ui-sales-workflow\.js|ly-panel-lazy-render-recovery\.js/,'non-critical presentation/recovery layers must stay outside critical precache budget');

console.log('Responsive UI + accessibility + history/sales lazy-render recovery: PASS');
