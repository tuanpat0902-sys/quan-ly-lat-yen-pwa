import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [layout,units,sidebar,conversion,index,loader]=await Promise.all([
  fs.readFile(new URL('../ly-ingredient-table-ux.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-unit-conversions.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-ingredient-sidebar-status.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-ingredient-conversion-sync.js',import.meta.url),'utf8'),
  fs.readFile(new URL('../index.html',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8')
]);

assert.match(layout,/VERSION='2026\.08\.29\.7'/);
assert.match(layout,/width:100%!important;min-width:1040px!important;max-width:none!important;table-layout:fixed!important/);
assert.match(layout,/scrollbar-gutter:stable!important/);
assert.match(layout,/window\.__lyUnitConversions\?\.enhanceIngredientTables\?\.\(\)[\s\S]*removeSupplierColumn\(table\)[\s\S]*markStableColumns\(table\)/,'purchase-unit insertion, supplier removal and stable sizing must run in deterministic order');

const widths=Object.fromEntries(
  [...layout.matchAll(/data-ly-ingredient-column="([^"]+)"\]\{width:(\d+)%!important/g)]
    .map(match=>[match[1],Number(match[2])])
);
assert.deepEqual(widths,{stt:5,name:14,unit:7,purchase:17,stock:7,minimum:7,status:10,cost:11,value:9,actions:13});
assert.equal(Object.values(widths).reduce((sum,value)=>sum+value,0),100,'desktop ingredient columns must fill the table exactly');

assert.match(units,/VERSION='2026\.08\.29\.5'/);
assert.match(units,/const unitIndex=headers\.indexOf\('Đơn vị'\);\s*if\(unitIndex<0\)return/,'purchase-unit enhancement must survive prior supplier-column removal');
assert.doesNotMatch(units,/supplierIndex<0/);
assert.match(index,/ly-unit-conversions\.js\?v=20260829\.5/);
assert.doesNotMatch(index,/<th>Nhà cung cấp gần nhất<\/th>/,'supplier column must not exist in the source table or flash before enhancement');
assert.match(index,/data-ly-purchase-column="1" data-ly-ingredient-column="purchase">Đơn vị mua\/đóng gói/,'purchase column must exist in the initial table render');
assert.match(index,/data-ly-purchase-cell="1" data-ly-ingredient-column="purchase"/,'purchase cells must exist before DOM enhancers run');
assert.match(loader,/loadCriticalTablePresentation[\s\S]*Promise\.all\([\s\S]*load\('ingredientTableUX'\)/,'ingredient geometry must load in parallel inside the global first-paint gate');
assert.match(units,/updateIngredientFormHint,packagingText,enhanceIngredientTables/,'first render must use the canonical purchase packaging formatter');
assert.match(loader,/ly-ingredient-table-ux\.js\?v=20260829\.7/);
assert.match(layout,/markSupportingTables\(\)/,'prepared and history table column contracts must be restored after rerenders');
assert.match(layout,/if\(rowIndex>0\)cell\.dataset\.lyLabel=labels\[index\]\|\|'Thao tác'/,'main ingredient mobile cards must receive labels after the STT column is inserted');
assert.match(layout,/table\.prepared-virtual-table>thead,#ingredients table\.ingredient-usage-table>thead/,'supporting-table headers must be removed from mobile card flow');
assert.match(layout,/table\.prepared-virtual-table\{width:100%!important;min-width:900px!important/,'prepared table must fill its desktop shell');
assert.match(layout,/table\.ingredient-usage-table\{width:100%!important;min-width:900px!important/,'history table must fill its desktop shell');

assert.match(sidebar,/VERSION='2026\.08\.29\.1'/);
assert.match(sidebar,/purchasedWarehouseIngredientsInDisplayOrder[\s\S]*warehouseIngredients[\s\S]*ingredient_type\|\|'purchased'/,'sidebar status must use the same selected-warehouse purchased rows as the table');
assert.doesNotMatch(sidebar,/return db\.ingredients/,'sidebar must not fall back to unscoped all-warehouse data');
assert.match(loader,/ly-ingredient-sidebar-status\.js\?v=20260829\.1/);

assert.match(conversion,/VERSION='2026\.08\.29\.3'/);
assert.match(loader,/ly-ingredient-conversion-sync\.js\?v=20260829\.3/);
assert.doesNotMatch(conversion,/#ingredients \.scroll\{[^}]*overflow-x:/,'conversion sync must not own the ingredient table scroll geometry');
assert.doesNotMatch(conversion,/table\.ingredient-stock-table:not\(\.prepared-virtual-table\)\{[^}]*\b(?:width|min-width|max-width|table-layout):/,'conversion sync must not override the canonical table geometry');
assert.doesNotMatch(conversion,/data-ly-col=|min-width:|max-width:|table-layout:|overflow-x:/,'conversion sync must not inject any late table geometry after refresh');

console.log('Ingredient stock table deterministic columns and stable sizing: PASS');
