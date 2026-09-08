import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [layout,units,sidebar,conversion,index,loader,finance,categoryApi,server]=await Promise.all([
  fs.readFile(new URL('../ly-ingredient-table-ux.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-unit-conversions.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-ingredient-sidebar-status.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-ingredient-conversion-sync.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../index.html',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-finance.js',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-ingredient-category-api.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-static-server.mjs',import.meta.url),'utf8')
]);

assert.match(layout,/VERSION='2026\.09\.08\.1'/);
assert.match(layout,/width:100%!important;min-width:1120px!important;max-width:none!important;table-layout:fixed!important/);
assert.match(layout,/scrollbar-gutter:stable!important/);
assert.match(layout,/window\.__lyUnitConversions\?\.enhanceIngredientTables\?\.\(\)[\s\S]*removeSupplierColumn\(table\)[\s\S]*markStableColumns\(table\)/,'purchase-unit insertion, supplier removal and stable sizing must run in deterministic order');

const widths=Object.fromEntries(
  [...layout.matchAll(/data-ly-ingredient-column="([^"]+)"\]\{width:(\d+)%!important/g)]
    .map(match=>[match[1],Number(match[2])])
);
assert.deepEqual(widths,{stt:5,name:13,category:8,unit:6,purchase:15,stock:7,minimum:7,status:9,cost:10,value:8,actions:12});
assert.equal(Object.values(widths).reduce((sum,value)=>sum+value,0),100,'desktop ingredient columns must fill the table exactly');

assert.match(units,/VERSION='2026\.08\.29\.5'/);
assert.match(units,/const unitIndex=headers\.indexOf\('Đơn vị'\);\s*if\(unitIndex<0\)return/,'purchase-unit enhancement must survive prior supplier-column removal');
assert.doesNotMatch(units,/supplierIndex<0/);
assert.match(index,/ly-unit-conversions\.js\?v=20260829\.5/);
assert.doesNotMatch(index,/<th>Nhà cung cấp gần nhất<\/th>/,'supplier column must not exist in the source table or flash before enhancement');
assert.match(index,/data-ly-purchase-column="1" data-ly-ingredient-column="purchase">Đơn vị mua\/đóng gói/,'purchase column must exist in the initial table render');
assert.match(index,/data-ly-purchase-cell="1" data-ly-ingredient-column="purchase"/,'purchase cells must exist before DOM enhancers run');
assert.match(index,/id="igInventoryCategory"[\s\S]*Nguyên liệu[\s\S]*Dụng cụ/,'ingredient form must expose the inventory category field');
assert.match(index,/data-ly-ingredient-column="category">Phân loại/,'ingredient table must show inventory category');
assert.match(index,/data-ly-ingredient-column="category"><span class="badge [^\n]+ingredientInventoryCategoryLabel\(i\)/,'ingredient table must render category as read-only text');
assert.doesNotMatch(index,/data-ly-ingredient-column="category"><select/,'ingredient category must only be editable from the edit form');
assert.match(index,/categoryValues\[ingredientInventoryCategory\(i\)\]\+=value/,'inventory valuation must aggregate materials and tools separately');
const categorySave=index.match(/async function saveIngredientInventoryCategory[\s\S]*?\n}\n\nfunction ingredientTable/)?.[0]||'';
assert.doesNotMatch(categorySave,/renderIngredients/,'category edits must not rerender the table and reset its scroll position');
assert.match(finance,/finance-inventory-category-grid[\s\S]*Tồn kho nguyên liệu[\s\S]*Tồn kho dụng cụ/,'finance report must display prominent material and tool inventory cards');
assert.match(finance,/categoryInventoryDifference[\s\S]*Khớp số liệu/,'finance report must visibly reconcile the category values to total inventory');
assert.match(categoryApi,/inventory_category[\s\S]*\['ingredient','tool'\]/,'Vibe category API must validate and persist both categories');
assert.match(server,/handleIngredientCategoryApi/,'Vibe server must expose category persistence');
assert.match(loader,/loadCriticalTablePresentation[\s\S]*Promise\.all\([\s\S]*load\('ingredientTableUX'\)/,'ingredient geometry must load in parallel inside the global first-paint gate');
assert.match(units,/updateIngredientFormHint,packagingText,enhanceIngredientTables/,'first render must use the canonical purchase packaging formatter');
assert.match(loader,/ly-ingredient-table-ux\.js\?v=20260908\.1/);
assert.match(layout,/@media\(max-width:0px\)\{/,'ingredient tables must not switch to mobile cards; their desktop reference widths stay scrollable');
assert.match(layout,/markSupportingTables\(\)/,'prepared and history table column contracts must be restored after rerenders');
assert.match(layout,/if\(rowIndex>0\)cell\.dataset\.lyLabel=labels\[index\]\|\|'Thao tác'/,'main ingredient mobile cards must receive labels after the STT column is inserted');
assert.match(layout,/table\.prepared-virtual-table\{width:100%!important;min-width:900px!important/,'prepared table must fill its desktop shell');
assert.match(layout,/table\.ingredient-usage-table\{width:100%!important;min-width:900px!important/,'history table must fill its desktop shell');

assert.match(sidebar,/VERSION='2026\.08\.29\.2'/);
assert.match(sidebar,/purchasedWarehouseIngredientsInDisplayOrder[\s\S]*warehouseIngredients[\s\S]*ingredient_type\|\|'purchased'/,'sidebar status must use the same selected-warehouse purchased rows as the table');
assert.doesNotMatch(sidebar,/return db\.ingredients/,'sidebar must not fall back to unscoped all-warehouse data');
assert.match(sidebar,/@media\(max-width:760px\)\{#nav>\.ly-sidebar-stock-status\{display:none!important\}\}/,'desktop stock summary must not increase the mobile navigation height');
assert.match(loader,/ly-ingredient-sidebar-status\.js\?v=20260829\.2/);

assert.match(conversion,/VERSION='2026\.08\.29\.3'/);
assert.match(loader,/ly-ingredient-conversion-sync\.js\?v=20260829\.3/);
assert.doesNotMatch(conversion,/#ingredients \.scroll\{[^}]*overflow-x:/,'conversion sync must not own the ingredient table scroll geometry');
assert.doesNotMatch(conversion,/table\.ingredient-stock-table:not\(\.prepared-virtual-table\)\{[^}]*\b(?:width|min-width|max-width|table-layout):/,'conversion sync must not override the canonical table geometry');
assert.doesNotMatch(conversion,/data-ly-col=|min-width:|max-width:|table-layout:|overflow-x:/,'conversion sync must not inject any late table geometry after refresh');

console.log('Ingredient stock table deterministic columns and stable sizing: PASS');
