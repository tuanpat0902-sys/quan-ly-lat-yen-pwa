# Performance & Architecture Audit V2

- index.html: 1302407 bytes
- root JS files: 27
- addEventListener calls: 106
- MutationObserver instances: 2
- setInterval calls in Legacy index: 5
- setTimeout calls: 94
- Supabase .from() call sites: 112
- Supabase .rpc() call sites: 22
- innerHTML assignments: 159
- resident render* functions in index: 21

## Legacy interval contexts
- line 15027: // Followers only refresh active UI from local cache. if(!v210IsLeader){ v218FollowerRefresh(); } } }; }catch(e){} } v210Heartbeat(); clearInterval(v210LeaderTimer); v210LeaderTimer= setInterval( v210Heartbeat, V210_LEADER_HEARTBEAT_MS ); window.addEventListener( 'storage', event=>{ if(event.key===V210_LEADER_KEY){ v210Heartbeat(); } } ); document.addEventListener( 'visibilitychan
- line 42706: facingMode:{ideal:'environment'}}, audio:false }); video.srcObject=pairingScanStream; await video.play(); if(status){ status.textContent='Camera đã sẵn sàng • đang tìm mã QR…'; } let decoding=false; pairingScanTimer=setInterval(async()=>{ if(decoding) return; try{ if(!video.videoWidth||!video.videoHeight) return; decoding=true; const raw=await v259DecodeQrFromVideo(video); if(!raw) return; if(status){ statu
- line 48459: er:V244_RESET_OWNER, at:Date.now(), version:251, stage }) ); } function v248StartResetHeartbeat(){ v248ResetRuntimeActive=true; clearInterval(v248ResetHeartbeatTimer); v248WriteResetHeartbeat('active'); v248ResetHeartbeatTimer=setInterval( ()=>v248WriteResetHeartbeat('active'), V248_HEARTBEAT_MS ); } function v248StopResetHeartbeat(){ v248ResetRuntimeActive=false; clearInterval(v248ResetHeartbeatTimer); v248ResetHeartbeatTimer=null; } async function v248AcquireWebL
- line 52907: DEBOUNCE_MS ); } function v269StartSyncEngine(){ if(v269SyncTimer){ clearInterval(v269SyncTimer); } setTimeout( ()=>v269SyncCycle({ forcePull:true, reason:'startup' }).catch(console.warn), 250 ); v269SyncTimer= setInterval( ()=>{ if( document.hidden || !navigator.onLine ){ return; } v269SyncCycle({ reason:'interval' }).catch(console.warn); }, V269_SYNC_INTERVAL_MS )
- line 53079: rtbeatTimer); } /* Run immediately after login/bootstrap; do not wait for the first timer. */ setTimeout( ()=>v268RunCloudCycle({ forcePull:true, reason:'startup' }).catch(console.warn), 350 ); v268HeartbeatTimer= setInterval( ()=>{ if( document.hidden || !navigator.onLine ){ return; } v268RunCloudCycle({ reason:'heartbeat' }).catch(console.warn); /* If websocket ha

## MutationObserver contexts
- line 51954: applySerialNumbers(target); applyTableColumnSizing(target); applyStickyTableHeaders(target); schedulePageStickyDock(); }); } function installTableEnhancementObserver(){ if(tableEnhancementObserver)return; tableEnhancementObserver= new MutationObserver(mutations=>{ let relevant=false; for(const m of mutations){ if( m.type!=='childList' || !m.addedNodes?.length )continue; if(m.target?.closest?.('#pageStickyTableDock')){ c

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
