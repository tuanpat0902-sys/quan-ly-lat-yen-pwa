import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const css=await fs.readFile(new URL('../ly-compact-admin-layout.js',import.meta.url),'utf8');

assert.match(html,/suppliers:`<span class="\$\{cls\}">/,'supplier menu icon must exist');
assert.match(html,/data-panel="suppliers"[\s\S]{0,120}<span>Nhà cung cấp<\/span>/,'supplier directory must be reachable from inventory navigation');
assert.match(html,/Quản lý nhà cung cấp/,'import receipt must link to supplier management');
assert.match(html,/Tên mới sẽ tự động được thêm vào danh sách nhà cung cấp khi lưu phiếu/,'import receipt must explain automatic supplier creation');
assert.match(html,/window\.__lyFreshHeaders\?\.importItems/,'supplier table must use linked Cloud import lines');
assert.match(html,/usage\.get\(s\.id\)/,'supplier table must show per-supplier usage');
assert.match(css,/\.supplier-page-head/,'supplier page must have responsive compact layout');
console.log('Supplier navigation and linkage UI: PASS');
