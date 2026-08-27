# Fresh Core V3 Architecture Contract

Fresh Core V3 is an incremental replacement runtime that coexists with Fresh Core V2 until each domain passes parity, performance, smoke, and rollback gates.

## Non-negotiable rules

1. Supabase remains the source of truth.
2. Browser code must never contain service-role credentials.
3. UI must not call Supabase directly.
4. Domain UI -> service -> repository -> data gateway is the required write/read path.
5. A domain has exactly one authoritative writer at a time.
6. V2/V3 dual-read is allowed during shadow migration; dual-write is forbidden.
7. All recurring work is owned by the Core Scheduler. Feature/domain modules must not call setInterval.
8. Realtime subscriptions are owned by the Realtime Manager.
9. Large collections must not live in the global application store.
10. Large-list access must use paged/ranged queries and the Query Cache.
11. Reports should prefer server-side aggregate/RPC/view queries over full-table browser aggregation.
12. Features must be lazy-loadable and expose lifecycle hooks.
13. Every migrated domain must have a rollback switch.
14. Legacy/V2 code is removed only after parity + production soak.
15. V3 foundation must remain side-effect free until explicitly started.

## Layer boundaries

UI -> Domain Service -> Repository -> Data Gateway -> Supabase

Core services (Store, Event Bus, Scheduler, Query Cache, Realtime Manager, Diagnostics)
may be consumed by domain services but may not depend on domain modules.

## Migration states

- v2: V2 is authoritative.
- shadow: V2 authoritative, V3 read/compare only.
- v3: V3 authoritative, V2 compatibility adapter may still serve legacy UI.
- retired: V2/legacy implementation removed.

## Initial migration waves

V3-0 Foundation
V3-1 Master Data
V3-2 Ingredients + Inventory
V3-3 Recipes / Products
V3-4 Imports / Exports / Stocktake
V3-5 Sales
V3-6 Employees
V3-7 Finance / Cashflow
V3-8 Reports + Notifications
V3-9 Legacy retirement
