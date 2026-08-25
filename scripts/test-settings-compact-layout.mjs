import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const layout=await fs.readFile(new URL('../ly-compact-admin-layout.js',import.meta.url),'utf8');
const enhancements=await fs.readFile(new URL('../ly-settings-enhancements.js',import.meta.url),'utf8');

const active=html.match(/<script id="fresh-settings-compact">([\s\S]*?)<\/script>/)?.[1]||html;
assert.match(active,/settings-head-actions/,'settings header actions must be compact');
assert.match(active,/settings-dashboard-grid-v2/,'settings cards must use the compact grid');
assert.match(active,/<details class="settings-advanced-tools">/,'legacy cleanup must be placed under advanced tools');
assert.doesNotMatch(active,/class="settings-health-grid"/,'large duplicate health cards must be removed');
assert.doesNotMatch(active,/class="settings-device-note"/,'duplicate account device note must be removed');
assert.match(layout,/grid-template-areas:'cloud identity' 'notify data'/,'desktop settings must use a balanced two-column layout');
assert.match(layout,/@media\(max-width:900px\)/,'settings layout must collapse responsively');
assert.match(enhancements,/<details class="ly-version-details">/,'technical version information must be collapsed');
assert.match(enhancements,/2026\.08\.24\.4/,'settings enhancement cache version must be current');
assert.match(layout,/--ly-ui-font:/,'application must define one shared typeface token');
assert.match(layout,/--ly-font-base:12px/,'application must define one shared body text size');
assert.match(layout,/table th\{font-size:var\(--ly-font-sm\)/,'table headings must follow the shared type scale');
assert.match(layout,/\.ly-note-compact\{/,'long notes must use the shared compact display');
assert.match(layout,/version:'2026\.08\.25\.1'/,'compact layout cache version must be current');
console.log('Compact responsive Settings layout: PASS');
