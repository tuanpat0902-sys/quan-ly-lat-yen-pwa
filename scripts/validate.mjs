import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, join } from 'node:path';

const ROOT = process.cwd();
const INDEX_MAX_BYTES = 1_500_000;
const required = [
  'index.html',
  'sw.js',
  'manifest.webmanifest',
  'icon.svg',
  'ly-module-loader.js',
  'ly-history-bridge.js',
  'ly-activity-history.js',
  'ly-data-notifications.js',
  'ly-inapp-notifications.js',
  'ly-notification-center.js',
  'ly-cloud-realtime.js',
  'ly-menu-security.js',
  'ly-performance-optimizer.js',
  'ly-heavy-panels.js'
];

let failed = false;
function fail(message) { failed = true; console.error(`FAIL: ${message}`); }
function ok(message) { console.log(`PASS: ${message}`); }

for (const file of required) {
  const path = join(ROOT, file);
  if (!existsSync(path)) fail(`missing ${file}`);
  else ok(`found ${file}`);
}

if (existsSync(join(ROOT, 'index.html'))) {
  const indexPath=join(ROOT,'index.html');
  const size = statSync(indexPath).size;
  const html=readFileSync(indexPath,'utf8');
  console.log(`INFO: index.html ${(size / 1024).toFixed(1)} KiB (${size} bytes)`);
  if (size > INDEX_MAX_BYTES) fail(`index.html exceeds ${(INDEX_MAX_BYTES / 1024).toFixed(0)} KiB safety ceiling`);
  else ok('index.html is inside safety ceiling');
  for(const fn of ['auditActionClass','auditFilterRows','renderHistory']){
    if(new RegExp(`\\bfunction\\s+${fn}\\s*\\(`).test(html))fail(`index.html still contains extracted ${fn}()`);
  }
  for(const kept of ['compactAuditRows','loadAuditLog','saveAuditLog','auditLog','debouncedHistoryRender']){
    if(!new RegExp(`\\bfunction\\s+${kept}\\s*\\(`).test(html))fail(`index.html lost required core ${kept}()`);
  }
  if(!failed)ok('Activity History UI is extracted while audit core stays resident');
}

const rootFiles = readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .map((entry) => entry.name)
  .sort();

for (const file of rootFiles) {
  const result = spawnSync(process.execPath, ['--check', join(ROOT, file)], { encoding: 'utf8' });
  if (result.status !== 0) {
    fail(`${file} syntax check failed`);
    if (result.stderr) console.error(result.stderr.trim());
  } else {
    ok(`${file} syntax`);
  }
}

if (existsSync(join(ROOT, 'ly-module-loader.js'))) {
  const loader = readFileSync(join(ROOT, 'ly-module-loader.js'), 'utf8');
  for (const marker of ['heavyPanels', 'finance', 'employees', 'history','activityHistory','ly-activity-history.js']) {
    if (!loader.includes(marker)) fail(`module loader missing ${marker}`);
  }
  if (!failed) ok('module loader lazy Activity History wiring');
}

if (existsSync(join(ROOT, 'sw.js'))) {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  for (const asset of ['ly-module-loader.js','ly-history-bridge.js','ly-activity-history.js','ly-heavy-panels.js','ly-menu-security.js','ly-performance-optimizer.js']) {
    if (!sw.includes(asset)) fail(`service worker does not reference ${asset}`);
  }
  if(/scripts\.push\([^\n]*ly-activity-history\.js/.test(sw))fail('Activity History full module must not be injected at startup');
  const cache = sw.match(/const CACHE='([^']+)'/)?.[1];
  if (!cache) fail('service worker cache version not found');
  else console.log(`INFO: service worker cache ${cache}`);
}

const clientFiles = ['index.html', ...rootFiles];
const privateKeyPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=/i,
  /service_role\s*:\s*['"][A-Za-z0-9._-]{20,}/i
];
for (const file of clientFiles) {
  const path = join(ROOT, file);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, 'utf8');
  for (const pattern of privateKeyPatterns) {
    if (pattern.test(text)) fail(`possible service-role secret in client file ${basename(file)}`);
  }
}
if (!failed) ok('no obvious service-role secret in client runtime files');

if (failed) {
  console.error('\nProduction validation failed. Deployment must stop.');
  process.exit(1);
}
console.log('\nProduction validation passed.');
