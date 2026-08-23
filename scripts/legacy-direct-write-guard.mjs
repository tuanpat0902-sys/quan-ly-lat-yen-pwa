import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');

// These are the only intentional Legacy UI direct table mutations that still
// exist in index.html. Each one is intercepted by a Fresh Core V2 takeover
// adapter at runtime. This guard prevents the monolith from growing new direct
// Supabase write paths while the strangler migration is in progress.
const baseline = new Map([
  ['ly_suppliers:insert', 1],
  ['ly_suppliers:upsert', 1],
  ['ly_warehouses:upsert', 1],
  ['ly_inventory:upsert', 1],
  ['ly_ingredients:delete', 1],
  ['ly_products:delete', 1],
  ['ly_cashflow_entries:upsert', 1],
  ['ly_cashflow_entries:delete', 1]
]);

const normalized = source.replace(/\s+/g, ' ');
const found = new Map();
const mutation = /(?:\bsb\s*|window\.sb\s*)\.from\(\s*['"](ly_[a-z0-9_]+)['"]\s*\)\s*\.\s*(insert|upsert|update|delete)\s*\(/gi;

for (const match of normalized.matchAll(mutation)) {
  const key = `${match[1]}:${match[2].toLowerCase()}`;
  found.set(key, (found.get(key) || 0) + 1);
}

const failures = [];
for (const [key, count] of found) {
  const allowed = baseline.get(key) || 0;
  if (count > allowed) failures.push(`${key}: found ${count}, allowed ${allowed}`);
}
for (const [key, allowed] of baseline) {
  const count = found.get(key) || 0;
  if (count < allowed) {
    // A reduction is migration progress, not a failure. Surface it so the
    // baseline can be tightened in a follow-up without blocking deployment.
    console.log(`Legacy direct-write reduced: ${key} ${allowed} -> ${count}`);
  }
}

if (failures.length) {
  console.error('Legacy direct-write guard: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('Route new mutations through Fresh Core V2 instead of adding direct Supabase writes to index.html.');
  process.exit(1);
}

console.log(`Legacy direct-write guard: PASS (${[...found.values()].reduce((a,b)=>a+b,0)} intercepted direct table mutations remain)`);
