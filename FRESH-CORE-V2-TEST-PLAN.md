# Fresh Core V2 — Test Candidate Plan

Status target: **feature-complete / ready for UAT**, not production-signoff.

## Gate 1 — Cold start / fresh install
- Open on a device with no existing site data.
- Sign in and confirm Fresh Core V2 shadow reaches ready for the correct org.
- Verify warehouses, suppliers, ingredients, prepared items, products/recipes, inventory, documents, sales and cashflow render.
- Reload once online, then verify app can reopen with cached runtime assets.

## Gate 2 — CRUD parity
For each owned domain, create/edit/delete where supported and compare another device/session:
- Warehouses / suppliers and inventory initialization.
- Ingredients / prepared items.
- Products / recipes.
- Import / export / stocktake.
- Sales.
- Cashflow.
Expected: one cloud mutation, immediate local UI update, no duplicate rows, no double stock movement.

## Gate 3 — Inventory effects
- Import increases stock once.
- Export and sale decrease stock once.
- Stocktake reconciles stock once.
- Delete/undo-supported document flows leave balances and stock_transactions consistent.

## Gate 4 — Realtime / reconnect
- Keep device A and B open on the same org.
- Mutate on A; B must refresh only the affected V2 domain.
- Put B offline, mutate on A, reconnect B; reconnect catch-up must converge state.
- Confirm Legacy full-refresh realtime stays retired while V2 is healthy and can recover as fallback after a forced V2 channel error.

## Gate 5 — Refresh paths
- Background then foreground the PWA: V2 refresh + hydration fast-path should render without Legacy loadCloud normal path.
- Run the normal manual refresh: V2 manual fast-path should complete.
- Force V2-not-ready/offline/org-mismatch and confirm Legacy fallback still works.
- Diagnostic/migration/nonstandard refresh calls must remain authoritative Legacy paths.

## Gate 6 — Offline / service worker
- With assets already cached, reopen without network and verify UI bootstrap does not crash.
- Restore network and confirm realtime reconnect catch-up converges.

## Gate 7 — Regression
- Finance, reports, activity history, employees, settings, notifications and existing lazy UI modules still open and render.
- No new direct Legacy Supabase writes are allowed by CI.
- `npm run check` and Fresh Install Stability must both pass on the release candidate SHA.

## Exit criteria for UAT
Fresh Core V2 may leave UAT only when all gates above pass on at least two browser/device sessions using the same org, including one disconnect/reconnect scenario and one fresh-install scenario. Any stock discrepancy, double-write, stale cross-device state, or fallback failure is release-blocking.
