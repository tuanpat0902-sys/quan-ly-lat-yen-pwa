import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /const INGREDIENT_USAGE_PAGE_SIZE=50/, 'usage history must have a 50-row page size');
assert.match(html, /rows\.slice\(pageStart,pageStart\+INGREDIENT_USAGE_PAGE_SIZE\)/, 'usage history must render the selected page rather than permanently slicing the newest rows');
assert.match(html, /function changeIngredientUsagePage/, 'older history must be reachable through pagination');
assert.match(html, /Cũ hơn →/, 'the UI must expose the action for older history');
assert.doesNotMatch(html, /Đang hiển thị 500 lượt gần nhất/, 'the obsolete 500-row limit must be removed');
assert.match(html, /_line_order:Number\(item\.line_order\|\|itemIndex\+1\)/, 'import history must retain the entered line order');
assert.match(html, /receiptRowsByKey[\s\S]*?\.sort\(\(a,b\)=>Number\(a\._line_order\|\|0\)-Number\(b\._line_order\|\|0\)/, 'receipt details must sort by saved line order');
assert.match(html, /line_order:lineIndex\+1/, 'new import receipts must send the entered line order');
assert.match(html, /lineOrder:lineIndex\+1/, 'local-first import receipts must retain the entered line order');

console.log('Ingredient usage history pagination: PASS');
