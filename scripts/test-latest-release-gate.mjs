import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const sw=fs.readFileSync('sw.js','utf8');
const prep=fs.readFileSync('scripts/prepare-pages-artifact.mjs','utf8');
const index=fs.readFileSync('index.html','utf8');
const cashflow=fs.readFileSync('ly-cashflow.js','utf8');
const employees=fs.readFileSync('ly-employees.js','utf8');

assert.match(sw,/ignoreSearch:false/,'static cache must honor version query strings');
assert.match(sw,/runtime-version\.json/,'service worker must special-case runtime-version.json');
assert.match(sw,/clients\.matchAll\(\{type:'window',includeUncontrolled:true\}\)/,'service worker must enumerate open clients after release activation');
assert.match(sw,/LAT_YEN_UPDATE_AVAILABLE/,'service worker must notify open Vibe clients without interrupting active forms');
assert.doesNotMatch(sw,/url\.searchParams\.set\('ly_release'/,'service worker must not navigate an active Vibe form during deployment');
const importGuard=index.match(/function renderImports\(forceReset=false\)\{([\s\S]*?)const defaultReceipt=/)?.[1];
assert.ok(importGuard,'import renderer must check for an open draft before replacing the panel');
let draftOpen=true;
const renderContext={E:{imports:{querySelector:()=>draftOpen?{}:null}},window:{v240DeferOpenFormRender:()=>{}}};
vm.runInNewContext(`function renderImports(forceReset=false){${importGuard}return 'rendered';}`,renderContext);
assert.equal(renderContext.renderImports(),undefined,'background refresh must preserve an open import receipt');
assert.equal(renderContext.renderImports(true),'rendered','explicit edit may intentionally reset an import receipt');
draftOpen=false;
assert.equal(renderContext.renderImports(),'rendered','closed import panel must refresh normally');
for(const [renderer,formId] of [
  ['renderIngredients','ingredientInlinePanel'],
  ['renderRecipes','inlineRecipeForm'],
  ['renderSales','inlineSaleReceiptForm'],
  ['renderStocktake','inlineStocktakeForm']
]){
  assert.match(index,new RegExp(`function ${renderer}\\(forceReset=false\\)\\{[\\s\\S]{0,220}${formId}[\\s\\S]{0,160}v240DeferOpenFormRender`),`${renderer} must preserve and reschedule an active draft`);
}
assert.match(cashflow,/function renderCashflow\(forceReset=false\)\{[\s\S]{0,140}cashflowFormOpen[\s\S]{0,160}v240DeferOpenFormRender/,'cashflow background refresh must preserve an open voucher');
assert.match(employees,/function renderEmployees\(\)\{[\s\S]{0,300}v240DeferOpenFormRender/,'employee background refresh must preserve the focused editor');
assert.match(index,/function editStocktakeReceipt[\s\S]*?renderStocktake\(true\)/,'explicit stocktake edit must still open the selected receipt');
assert.match(index,/function editSaleReceipt[\s\S]*?renderSales\(true\)/,'explicit sale edit must still open the selected receipt');
assert.match(prep,/lyReleaseGate/,'Pages artifact must inject an early release gate');
assert.match(prep,/controllerchange/,'release gate must reload after service-worker controller changes');
assert.match(prep,/EXPECTED_VERSION/,'release gate must know the expected release version');
assert.match(prep,/caches\.keys/,'release gate must be able to clear stale runtime caches');
console.log('Latest-release browser gate: PASS');
