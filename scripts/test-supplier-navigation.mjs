import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const css=await fs.readFile(new URL('../ly-compact-admin-layout.js',import.meta.url),'utf8');

assert.doesNotMatch(html,/<button[^>]+data-panel="suppliers"/,'supplier must not be a left-menu item');
assert.match(html,/Quản lý nhà cung cấp/,'import receipt must retain supplier management');
assert.match(html,/Tên mới sẽ tự động được thêm vào danh sách nhà cung cấp khi lưu phiếu/,'automatic supplier creation guidance must remain');
assert.match(html,/window\.__lyFreshHeaders\?\.importItems/,'supplier table must retain linked Cloud import lines');
assert.match(html,/usage\.get\(s\.id\)/,'supplier table must retain per-supplier usage');
assert.match(css,/\.supplier-page-head/,'supplier page layout must remain');
console.log('Supplier menu hidden; supplier functions retained: PASS');
