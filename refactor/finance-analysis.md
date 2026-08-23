# Finance dependency analysis

- index.html bytes: 1374361

## UI extraction candidates
- `renderFinance`: line 39744 -> next `financeDefaultFromDate` line 39820, source span 2878 bytes
- `renderFinanceData`: line 40247 -> next `drawFinanceTrend` line 40896, source span 18299 bytes

## Finance-related functions in source order
- `cachedFinanceRows`: line 16354
- `financeExportsInRange`: line 39264
- `exportReceiptFinanceTreatmentFromMovement`: line 39289
- `financeExportExpenseValue`: line 39312
- `financeMovementBusinessDateISO`: line 39323
- `financeInventorySnapshot`: line 39364
- `financeInventoryPeriod`: line 39474
- `financeCurrentYear`: line 39511
- `financeYearMonthlyBreakdown`: line 39515
- `financeYearBreakdownHtml`: line 39598
- `renderFinance`: line 39744
- `financeDefaultFromDate`: line 39820
- `setFinanceQuickRange`: line 39826
- `financeRange`: line 39898
- `financeDateISO`: line 39951
- `financeSalesInRange`: line 39957
- `financeImportsInRange`: line 39980
- `financeSalaryCostInRange`: line 40064
- `financeCashflowInRange`: line 40100
- `financeStocktakeInRange`: line 40166
- `renderFinanceData`: line 40247
- `drawFinanceTrend`: line 40896

No production code is changed by this analyzer.