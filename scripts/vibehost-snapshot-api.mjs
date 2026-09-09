import { createHash } from 'node:crypto';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { getVibePool } from './vibehost-db.mjs';
import { authenticatedVibeUser } from './vibehost-auth-api.mjs';

const gzipAsync = promisify(gzip);
const schema = 'lat_yen_shadow_20260905';
const tables = Object.freeze([
  'ly_warehouses', 'ly_suppliers', 'ly_ingredients', 'ly_prepared_items',
  'ly_products', 'ly_recipe_items', 'ly_inventory',
  'ly_import_receipts', 'ly_import_items', 'ly_export_receipts', 'ly_export_items',
  'ly_stocktake_receipts', 'ly_stocktake_items', 'ly_sales', 'ly_sale_items',
  'ly_stock_transactions', 'ly_cashflow_entries',
]);
const authCache = new Map();
const snapshotCache = new Map();
const pendingSnapshots = new Map();
const requestWindows = new Map();
let ingredientCategoryReady;

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Length': body.length,
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  response.end(body);
}

function bearerToken(request) {
  const header = String(request.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function rateLimitKey(request, token) {
  return `${request.socket?.remoteAddress || 'unknown'}:${createHash('sha256').update(token).digest('hex').slice(0, 16)}`;
}

function allowRequest(request, token) {
  const now = Date.now();
  const key = rateLimitKey(request, token);
  const entry = requestWindows.get(key);
  if (!entry || now - entry.startedAt >= 60_000) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= 30;
}

async function authenticatedUser(token) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const cached = authCache.get(tokenHash);
  if (cached && cached.expiresAt > Date.now()) return cached.userId;

  const projectUrl = String(process.env.LAT_YEN_SUPABASE_API_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!projectUrl || !publishableKey) throw new Error('Supabase authentication verifier is unavailable');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${projectUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!response.ok) return '';
    const user = await response.json();
    const userId = String(user?.id || '');
    if (!userId) return '';
    authCache.set(tokenHash, { userId, expiresAt: Date.now() + 120_000 });
    return userId;
  } finally {
    clearTimeout(timeout);
  }
}

async function isMember(userId, orgId) {
  const result = await getVibePool().query(
    `select 1 from ${quoteIdentifier(schema)}.ly_org_members where user_id = $1::uuid and org_id = $2::uuid limit 1`,
    [userId, orgId],
  );
  return result.rowCount > 0;
}

async function buildSnapshot(orgId) {
  const pool = getVibePool();
  const client = await pool.connect();
  let tableResults, signals;
  let transactionStarted = false;
  try {
    ingredientCategoryReady||=client.query(`alter table ${quoteIdentifier(schema)}.ly_ingredients add column if not exists inventory_category text not null default 'ingredient'`).catch(error=>{ingredientCategoryReady=null;throw error;});
    await ingredientCategoryReady;
    await client.query('begin isolation level repeatable read read only');
    transactionStarted = true;
    tableResults=[];
    for(const table of tables)tableResults.push(await client.query(
      `select * from ${quoteIdentifier(schema)}.${quoteIdentifier(table)} where org_id = $1::uuid`,
      [orgId],
    ));
    signals = await client.query(
      `select domain, revision, changed_at from ${quoteIdentifier(schema)}.ly_change_signals where org_id = $1::uuid order by domain`,
      [orgId],
    );
    await client.query('commit');
    transactionStarted = false;
  } finally {
    if (transactionStarted) await client.query('rollback').catch(() => {});
    client.release();
  }
  const data = Object.fromEntries(tables.map((table, index) => [table, tableResults[index].rows]));
  const revisions = Object.fromEntries(signals.rows.map((row) => [row.domain, Number(row.revision)]));
  const payload = {
    version: '2026.09.06.1',
    orgId,
    mirroredAt: new Date().toISOString(),
    revisions,
    tables: data,
  };
  const body = Buffer.from(JSON.stringify(payload));
  const compressed = await gzipAsync(body, { level: 6 });
  return { body, compressed, expiresAt: Date.now() + 15_000 };
}

async function snapshotFor(orgId) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const cached = snapshotCache.get(orgId);
    if (cached && cached.expiresAt > Date.now()) return cached;
    let entry = pendingSnapshots.get(orgId);
    if (!entry) {
      entry = { invalidated: false, pending: null };
      entry.pending = buildSnapshot(orgId).then((snapshot) => {
        if (!entry.invalidated) snapshotCache.set(orgId, snapshot);
        return snapshot;
      }).finally(() => {
        if (pendingSnapshots.get(orgId) === entry) pendingSnapshots.delete(orgId);
      });
      pendingSnapshots.set(orgId, entry);
    }
    const snapshot = await entry.pending;
    if (!entry.invalidated) return snapshot;
  }
  throw new Error('Snapshot changed repeatedly; retry the request');
}

export async function handleSnapshotApi(request, response, pathname, url) {
  const activityRequest = pathname === '/api/v1/activity-events';
  if (pathname !== '/api/v1/snapshot' && !activityRequest) return false;
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    sendJson(response, 405, { error: 'Method Not Allowed' });
    return true;
  }
  if (process.env.VIBE_READ_CACHE !== '1') {
    sendJson(response, 503, { error: 'Read cache is disabled' });
    return true;
  }

  const token = bearerToken(request)||'cookie-session';
  const orgId = String(url.searchParams.get('org_id') || '');
  if (!token || !/^[0-9a-f-]{36}$/i.test(orgId)) {
    sendJson(response, 401, { error: 'Authentication required' });
    return true;
  }
  if (!allowRequest(request, token)) {
    sendJson(response, 429, { error: 'Too many requests' }, { 'Retry-After': '60' });
    return true;
  }

  try {
    const vibeUser=await authenticatedVibeUser(request);
    const userId=vibeUser?.id||await authenticatedUser(token);
    const allowed=vibeUser?vibeUser.orgId===orgId:(userId&&await isMember(userId,orgId));
    if (!allowed) {
      sendJson(response, 403, { error: 'Organization access denied' });
      return true;
    }
    if (activityRequest) {
      const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20));
      const after = Math.max(0, Number.parseInt(url.searchParams.get('after') || '0', 10) || 0);
      const values = [orgId];
      let where = 'org_id = $1::uuid';
      if (after) { values.push(after); where += ` and id > $${values.length}`; }
      values.push(limit);
      const result = await getVibePool().query(
        `select id,org_id,entity_table,entity_id,event_type,entity_name,amount,created_at from ${quoteIdentifier(schema)}.ly_activity_events where ${where} order by id ${after ? 'asc' : 'desc'} limit $${values.length}`,
        values,
      );
      sendJson(response, 200, { rows: result.rows });
      return true;
    }
    const snapshot = await snapshotFor(orgId);
    const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(String(request.headers['accept-encoding'] || ''));
    const body = acceptsGzip ? snapshot.compressed : snapshot.body;
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      ...(acceptsGzip ? { 'Content-Encoding': 'gzip' } : {}),
      'Content-Length': body.length,
      'Content-Type': 'application/json; charset=utf-8',
      'Vary': 'Authorization, Accept-Encoding',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(body);
  } catch (error) {
    const message = String(error?.message || error)
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[database-url-redacted]')
      .slice(0, 300);
    console.error(`[snapshot-api] failed (${error?.code || 'UNKNOWN'}): ${message}`);
    sendJson(response, 503, { error: 'Read cache is temporarily unavailable' });
  }
  return true;
}

export function invalidateSnapshot(orgId) {
  if (orgId) {
    const key = String(orgId);
    snapshotCache.delete(key);
    const entry = pendingSnapshots.get(key);
    if (entry) entry.invalidated = true;
    pendingSnapshots.delete(key);
  } else {
    snapshotCache.clear();
    for (const entry of pendingSnapshots.values()) entry.invalidated = true;
    pendingSnapshots.clear();
  }
}
