# Fresh Core V2

Fresh Core V2 is the replacement application core built behind the existing Lát Yên UI/UX.

## Migration rule

- Preserve the current UI/UX and DOM contracts until a domain has parity tests.
- UI must not call Supabase directly once migrated.
- Business access flows through domain service -> repository -> centralized Supabase gateway.
- Supabase remains the source of truth.
- No service-role credentials are permitted in browser code.
- Legacy Core-38 remains the active browser runtime until Shadow Mode and domain parity gates pass.

## Current domain coverage

Ingredients, Products/Recipes, Import, Export, Stocktake, Sales and Cashflow are represented in V2 repositories/services with production RPC contracts covered by tests.

Foundation/domain contracts are ready for the Shadow Mode migration phase.
