import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /const INGREDIENT_USAGE_PAGE_SIZE=50/, 'usage history must have a 50-row page size');
assert.match(html, /rows\.slice\(pageStart,pageStart\+INGREDIENT_USAGE_PAGE_SIZE\)/, 'usage history must render the selected page rather than permanently slicing the newest rows');
assert.match(html, /function changeIngredientUsagePage/, 'older history must be reachable through pagination');
assert.match(html, /Cũ hơn →/, 'the UI must expose the action for older history');
assert.doesNotMatch(html, /Đang hiển thị 500 lượt gần nhất/, 'the obsolete 500-row limit must be removed');

console.log('Ingredient usage history pagination: PASS');
