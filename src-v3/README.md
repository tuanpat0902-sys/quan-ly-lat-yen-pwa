# Fresh Core V3

Fresh Core V3 is now the **authoritative application shell** for Lát Yên.

## Production authority

Fresh Core V3 owns:
- application navigation;
- active-panel state;
- feature lifecycle;
- V3 diagnostics and core services.

Fresh Core V2 remains temporarily as a **compatibility layer** for business-data repositories, existing renderers, and domain operations that have not yet completed migration.

This is a controlled migration, not a dual-write architecture. Supabase remains the source of truth and V3 introduces no paid service.

## Foundation components

- Feature Registry
- Event Bus
- Working-set Store
- Central Scheduler
- Query Cache
- Realtime Manager
- Supabase Gateway primitives
- Diagnostics/Health snapshot
- V2 compatibility adapter
- Authoritative V3 Router

## Migration principle

Each business domain moves from V2 compatibility to V3 independently after parity, performance, smoke, rollback and production-soak gates pass.
