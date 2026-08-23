# Activity History extraction analysis

- index.html bytes: 1387243
- target range: lines 43955-44175
- target function bytes: 6597
- target functions: 7
- unexpected code/comments between target functions: YES

## Exact target functions
- `compactAuditRows`: lines 43955-43973, 661 bytes
- `loadAuditLog`: lines 44026-44031, 157 bytes
- `saveAuditLog`: lines 44033-44035, 108 bytes
- `auditLog`: lines 44037-44050, 596 bytes
- `auditActionClass`: lines 44052-44058, 360 bytes
- `auditFilterRows`: lines 44060-44078, 699 bytes
- `renderHistory`: lines 44080-44175, 4016 bytes

## Other history/audit functions intentionally excluded
- `v254NewWarehouseAudit`: line 17686
- `v229RepairMissingHistory`: line 24002
- `debouncedHistoryRender`: line 26752
- `ingredientUsageHistoryHtml`: line 27601
- `renderIngredientUsageHistory`: line 27725
- `importReceiptHistoryTable`: line 28532
- `toggleReceiptHistory`: line 28673
- `exportReceiptHistoryTable`: line 30407
- `warehouseReceiptHistoryTable`: line 31097
- `saleReceiptHistoryTable`: line 34369
- `recentStocktakeHistory`: line 37212
- `stocktakeReceiptHistory`: line 37511
- `v245PreNormalizeIntegrityAudit`: line 50158
- `v244LocalIntegrityAudit`: line 51295
- `lyFreshSaleHistoryTime`: line 57613

## Extraction gate

BLOCKED: the target functions are not a contiguous clean block; review surrounding source before removal.

Production index.html is unchanged by this analysis.