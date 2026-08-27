# Fresh Core V3

Fresh Core V3 is the next-generation application core for Lát Yên.

The initial V3 runtime is **shadow-only** and must not become authoritative until migration gates pass.

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

## Current production impact

None. V3 is not wired into the production bootstrap yet.

## Migration principle

Migrate one domain at a time. V2 stays authoritative until the domain passes parity, performance, smoke, and rollback tests.
