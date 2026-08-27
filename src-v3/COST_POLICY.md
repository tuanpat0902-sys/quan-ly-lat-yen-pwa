# Fresh Core V3 Zero-Added-Cost Policy

Fresh Core V3 must not introduce any new paid service, paid infrastructure, paid API, paid monitoring, paid Supabase branch/project, or chargeable external dependency.

The migration may use only the existing application infrastructure and free-tier resources already in use.

## Shadow-soak limits

Master Data production shadow soak is read-only.

- No cloud diagnostic writes.
- No additional backend service.
- No external telemetry.
- At most two Master Data soak runs per device per rolling day.
- Exactly two lightweight Master Data reads per run: warehouses and suppliers.
- Diagnostics are stored only in browser localStorage.
- V2 remains authoritative.
- A failed or mismatched V3 read must never affect the UI or business writes.

If a later migration step requires added cost, it must stop before implementation and require a new explicit decision.
