import { runVibeHostShadowMigration } from './vibehost-postgres-shadow-migration.mjs';

try {
  await runVibeHostShadowMigration();
} catch (error) {
  const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN';
  const message = String(error?.message || error || 'Unknown migration failure')
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[database-url-redacted]')
    .slice(0, 500);
  console.error(`[migration] failed (${code}): ${message}`);
  console.error('[migration] source remains authoritative; static server will continue');
}
try {
  const { startSupabaseMirror } = await import('./vibehost-supabase-mirror.mjs');
  startSupabaseMirror();
} catch (error) {
  console.error(`[mirror] startup failed (${error?.code || 'UNKNOWN'}); source remains authoritative`);
}
try {
  const { startVibeIposWorker } = await import('./vibehost-ipos-worker.mjs');
  startVibeIposWorker();
} catch (error) {
  console.error(`[ipos-vibe] startup failed (${error?.code || 'UNKNOWN'}); existing Vibe data remains available`);
}
await import('./vibehost-static-server.mjs');
