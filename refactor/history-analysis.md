# History extraction analysis

- index.html bytes: 1387243
- renderHistory lines: 44080-44175
- renderHistory bytes: 4016
- history/audit named functions found: 22
- combined candidate bytes: 56533

## Candidate functions
- `v254NewWarehouseAudit`: lines 17686-17719, 857 bytes
- `v229RepairMissingHistory`: lines 24002-24212, 3489 bytes
- `debouncedHistoryRender`: lines 26752-26755, 130 bytes
- `ingredientUsageHistoryHtml`: lines 27601-27601, 46 bytes
- `renderIngredientUsageHistory`: lines 27725-27750, 653 bytes
- `importReceiptHistoryTable`: lines 28532-28659, 5674 bytes
- `toggleReceiptHistory`: lines 28673-28679, 223 bytes
- `exportReceiptHistoryTable`: lines 30407-30620, 6812 bytes
- `warehouseReceiptHistoryTable`: lines 31097-31417, 10454 bytes
- `saleReceiptHistoryTable`: lines 34369-34503, 3128 bytes
- `recentStocktakeHistory`: lines 37212-37315, 3980 bytes
- `stocktakeReceiptHistory`: lines 37511-37645, 6164 bytes
- `compactAuditRows`: lines 43955-43973, 661 bytes
- `loadAuditLog`: lines 44026-44031, 157 bytes
- `saveAuditLog`: lines 44033-44035, 108 bytes
- `auditLog`: lines 44037-44050, 596 bytes
- `auditActionClass`: lines 44052-44058, 360 bytes
- `auditFilterRows`: lines 44060-44078, 699 bytes
- `renderHistory`: lines 44080-44175, 4016 bytes
- `v245PreNormalizeIntegrityAudit`: lines 50158-50187, 550 bytes
- `v244LocalIntegrityAudit`: lines 51295-51676, 7407 bytes
- `lyFreshSaleHistoryTime`: lines 57613-57630, 369 bytes

## Possible external references used by renderHistory

`Bi`, `C`, `Ch`, `Chi`, `D`, `E`, `Ghi`, `H`, `Khu`, `L`, `Lo`, `N`, `Nguy`, `Nh`, `SL`, `T`, `Th`, `Theo`, `a`, `action`, `all`, `ang`, `audit`, `b`, `badge`, `bi`, `box`, `c`, `card`, `ch`, `count`, `created_at`, `currentWarehouseId`, `d`, `date`, `db`, `details`, `div`, `dt`, `dung`, `empty`, `esc`, `filter`, `find`, `g`, `gap`, `ghi`, `gian`, `grid`, `h`, `h2`, `h3`, `head`, `hi`, `history`, `historyFrom`, `historyModuleFilter`, `historySearch`, `historyTo`, `ho`, `id`, `ingredient_id`, `ingredients`, `innerHTML`, `input`, `join`, `k`, `kho`, `ki`, `label`, `length`, `li`, `limit`, `localeCompare`, `m`, `map`, `module`, `movements`, `muted`, `n`, `name`, `neg`, `ng`, `nh`, `note`, `num`, `ok`, `onchange`, `oninput`, `option`, `ph`, `phi`, `placeholder`, `qu`, `quantity`, `right`, `s`, `scroll`, `search`, `section`, `select`, `slice`, `sort`, `span`, `summary`, `t`, `table`, `td`, `th`, `thay`, `ti`, `time`, `to`, `tr`, `transaction_type`, `trong`, `type`, `u`, `v`, `value`, `vi`, `warehouse`, `warehouse_id`, `x`, `xu`, `y`

## Safety

This analysis does not modify index.html. Production extraction must only proceed after reviewing this report/candidate and passing npm run validate.