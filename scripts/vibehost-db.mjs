import pg from 'pg';

const { Pool } = pg;
let pool;

function connectionConfig(connectionString) {
  const url = new URL(connectionString);
  const hostname = url.hostname;
  const isInternal = !hostname.includes('.') || hostname.endsWith('.internal');
  return {
    host: hostname,
    port: Number.parseInt(url.port || '5432', 10),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
    max: 5,
    ssl: isInternal ? false : { rejectUnauthorized: false },
  };
}

export function getVibePool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('Vibe PostgreSQL connection is not configured');
  pool = new Pool(connectionConfig(connectionString));
  pool.on('error', (error) => console.error(`[database] idle connection error: ${error.code || 'UNKNOWN'}`));
  return pool;
}

export async function closeVibePool() {
  if (!pool) return;
  const current = pool;
  pool = undefined;
  await current.end();
}
