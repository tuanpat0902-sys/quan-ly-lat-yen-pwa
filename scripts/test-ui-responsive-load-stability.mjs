import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const ui=await fs.readFile(new URL('../ly-ui-stability.js',import.meta.url),'utf8');
const app=await fs.readFile(new URL('../ly-app-version.js',import.meta.url),'utf8');
const index=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');

assert.match(index,/viewport-fit=cover/,'mobile viewport must keep safe-area support');
assert.match(ui,/VERSION='2026\.08\.28\.2'/,'UI stability v2 must be active');
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
assert.match(app,/ensureUIStability\(\)/,'UI layer must be bootstrapped by app-version');
assert.match(app,/__lyUIStability\?\.version==='2026\.08\.28\.2'/,'app bootstrap must require the exact UI layer version');
assert.match(app,/ly-ui-stability\.js\?v=20260828\.2/,'UI layer must use deterministic asset version');
assert.doesNotMatch(ui,/MutationObserver/,'UI stability layer must not create DOM observation loops');
assert.doesNotMatch(ui,/\bfetch\s*\(/,'UI stability layer must not perform network calls');
assert.doesNotMatch(ui,/\.rpc\s*\(/,'UI stability layer must not call Supabase RPCs');
assert.doesNotMatch(ui,/renderAll|renderPanel|showTab/,'UI stability layer must not rerender application panels');

console.log('Responsive UI + accessibility + page-load stability: PASS');