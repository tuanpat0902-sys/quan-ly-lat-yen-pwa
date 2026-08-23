# Performance & Architecture Audit V2

- index.html: 1302407 bytes
- root JS files: 27
- addEventListener calls: 106
- MutationObserver instances: 2
- setInterval calls: 8
- setTimeout calls: 94
- Supabase .from() call sites: 112
- Supabase .rpc() call sites: 22
- innerHTML assignments: 159
- resident render* functions in index: 21

## Legacy interval snippets
- ``
- `async()=>{`
- ``
- ``
- ``

## Legacy timer globals
- v219DeferredTimer
- v220RenderTimer
- v234ComboIdleTimer
- v221SmartRenderTimer
- v208ActionSyncTimer
- v210LeaderTimer
- v235IdleReconcileTimer
- v218FollowerRenderTimer
- v206RealtimeVerifyTimer
- v207RenderTimer
- v207VerifyTimer
- v248ResetHeartbeatTimer
- v262Timer
- v269SyncTimer
- v269ActionTimer
- v268HeartbeatTimer

## Resident render functions
- renderCloudUsageV256
- renderSyncProgressLive
- renderSyncDiagnostics
- renderPendingInspector
- renderPendingBlockersV196
- renderMigrationProgressV199
- renderMigrationDedupV201
- renderPanel
- renderWarehouseSelect
- renderDashboard
- renderIngredientUsageHistory
- renderIngredients
- renderWarehouseMovementReport
- renderImports
- renderRecipes
- renderSales
- renderStocktake
- renderSuppliers
- renderWarehouses
- renderAdvancedSyncToolsV203
- renderAll

## Root JS sizes
- ly-activity-history.js: 5851 bytes
- ly-branding-sync.js: 8948 bytes
- ly-cashflow-bridge.js: 612 bytes
- ly-cashflow.js: 12642 bytes
- ly-cloud-realtime.js: 8882 bytes
- ly-data-notifications.js: 12734 bytes
- ly-employee-reports-bridge.js: 1140 bytes
- ly-employee-reports.js: 12956 bytes
- ly-employees-bridge.js: 937 bytes
- ly-employees.js: 8741 bytes
- ly-finance-bridge.js: 815 bytes
- ly-finance.js: 23612 bytes
- ly-heavy-panels.js: 3439 bytes
- ly-history-bridge.js: 1879 bytes
- ly-inapp-notifications.js: 3175 bytes
- ly-menu-security.js: 14976 bytes
- ly-module-loader.js: 2608 bytes
- ly-notification-center.js: 14020 bytes
- ly-performance-optimizer.js: 4849 bytes
- ly-reports-bridge.js: 743 bytes
- ly-reports.js: 5898 bytes
- ly-settings-enhancements.js: 6726 bytes
- ly-settings-ui-bridge.js: 771 bytes
- ly-settings-ui.js: 6499 bytes
- ly-special-reports-bridge.js: 1210 bytes
- ly-special-reports.js: 18755 bytes
- sw.js: 8241 bytes
