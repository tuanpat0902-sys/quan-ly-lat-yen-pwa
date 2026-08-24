# Quản Lý Lát Yên — Ver 2.1.37

Production PWA: https://tuanpat0902-sys.github.io/quan-ly-lat-yen-pwa/

## Current architecture

- Legacy UI shell in `index.html`
- Fresh Core V2 business domains in `src-v2/`
- Supabase project `isfotiyxufvsmlkqsgez` as the authoritative cloud data source
- GitHub Pages deployment through `.github/workflows/pages.yml`
- Service Worker cache `lat-yen-fresh-core-v2-authoritative-89`

## Verification

Run `npm run check`, or run the individual Node scripts in `package.json` when npm execution is restricted.

Historical SQL files and `supabase/migrations/` are retained for schema recovery and database traceability.
