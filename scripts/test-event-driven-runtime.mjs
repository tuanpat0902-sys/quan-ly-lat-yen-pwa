import assert from 'node:assert/strict';
import fs from 'node:fs';

const modules=[
  'ly-employee-termination-date.js',
  'ly-ingredient-conversion-sync.js',
  'ly-salary-fund-sync.js',
  'ly-stock-unit-sync.js',
];

for(const file of modules){
  const source=fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
  assert.doesNotMatch(source,/setInterval\s*\(/,`${file} must not poll forever in the browser`);
  assert.match(source,/latyen:panel/,`${file} must refresh when the active panel changes`);
}

console.log('Event-driven feature refresh without permanent polling: PASS');
