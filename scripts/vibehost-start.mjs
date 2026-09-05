import { runVibeHostShadowMigration } from './vibehost-postgres-shadow-migration.mjs';

await runVibeHostShadowMigration();
await import('./vibehost-static-server.mjs');

