import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, pagination] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../ly-ingredient-usage-history-pagination.js', import.meta.url), 'utf8')
]);

assert.match(html, /ly-ingredient-usage-history-pagination\.js\?v=20260831\.1/, 'usage pagination must load with the ingredient history');
assert.match(pagination, /const SIZE=250/, 'usage history must have a bounded page size');
assert.match(pagination, /rows\.slice\(page\*SIZE,page\*SIZE\+SIZE\)/, 'usage history must render the selected page rather than permanently slicing the newest rows');
assert.match(pagination, /changeIngredientUsagePage/, 'older history must be reachable through pagination');
assert.match(pagination, /Cũ hơn →/, 'the UI must expose the action for older history');

console.log('Ingredient usage history pagination: PASS');
