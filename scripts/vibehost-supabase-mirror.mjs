import { getVibePool } from './vibehost-db.mjs';
import { invalidateSnapshot } from './vibehost-snapshot-api.mjs';

const schema = 'lat_yen_shadow_20260905';
const intervalMs = 30_000;
const reconcileMs = 6 * 60 * 60 * 1_000;
const pageSize = 1_000;
const businessTables = Object.freeze([
  'ly_warehouses', 'ly_suppliers', 'ly_ingredients', 'ly_prepared_items',
  'ly_products', 'ly_recipe_items', 'ly_inventory',
  'ly_import_receipts', 'ly_import_items', 'ly_export_receipts', 'ly_export_items',
  'ly_stocktake_receipts', 'ly_stocktake_items', 'ly_sales', 'ly_sale_items',
  'ly_stock_transactions', 'ly_cashflow_entries',
]);
const domainTables = Object.freeze({
  masterData: ['ly_warehouses', 'ly_suppliers'],
  ingredients: ['ly_ingredients', 'ly_prepared_items', 'ly_recipe_items'],
  products: ['ly_products', 'ly_recipe_items'],
  inventory: ['ly_inventory', 'ly_stock_transactions'],
  imports: ['ly_import_receipts', 'ly_import_items', 'ly_inventory', 'ly_stock_transactions'],
  exports: ['ly_export_receipts', 'ly_export_items', 'ly_inventory', 'ly_stock_transactions'],
  stocktake: ['ly_stocktake_receipts', 'ly_stocktake_items', 'ly_inventory', 'ly_stock_transactions'],
  sales: ['ly_sales', 'ly_sale_items', 'ly_inventory', 'ly_stock_transactions'],
  cashflow: ['ly_cashflow_entries'],
});

let timer;
let running = false;
let stopped = false;

function qi(value) { return `"${String(value).replaceAll('"', '""')}"`; }
function safeMessage(error) {
  return String(error?.message || error).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[database-url-redacted]').slice(0, 300);
}
function sourceConfig() {
  return {
    url: String(process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    key: String(process.env.SUPABASE_SECRET_KEY || ''),
  };
}
function isActiveHour() {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23',
  }).format(new Date()));
  return hour >= 6;
}

async function restRows(table, query = '') {
  const { url, key } = sourceConfig();
  if (!url || !key) throw new Error('Supabase mirror credentials are unavailable');
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const separator = query ? '&' : '';
      const response = await fetch(`${url}/rest/v1/${table}?${query}${separator}limit=${pageSize}&offset=${offset}`, {
        headers: { apikey: key },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${table} REST ${response.status}`);
      const page = await response.json();
      rows.push(...page);
      if (page.length < pageSize) break;
    } finally { clearTimeout(timeout); }
  }
  return rows;
}

async function tableMetadata(table) {
  const pool = getVibePool();
  const [columns, primary] = await Promise.all([
    pool.query(`select column_name from information_schema.columns where table_schema=$1 and table_name=$2 order by ordinal_position`, [schema, table]),
    pool.query(`select a.attname as column_name from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace join unnest(i.indkey) with ordinality k(attnum, ord) on true join pg_attribute a on a.attrelid=c.oid and a.attnum=k.attnum where n.nspname=$1 and c.relname=$2 and i.indisprimary order by k.ord`, [schema, table]),
  ]);
  const names = columns.rows.map((row) => row.column_name);
  return { columns: names, primary: primary.rows.map((row) => row.column_name), cursor: names.includes('updated_at') ? 'updated_at' : names.includes('created_at') ? 'created_at' : '' };
}

async function replaceTable(table, rows) {
  const pool = getVibePool();
  const meta = await tableMetadata(table);
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`delete from ${qi(schema)}.${qi(table)}`);
    for (const row of rows) await insertRow(client, table, meta, row, false);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally { client.release(); }
}

async function insertRow(client, table, meta, row, upsert = true) {
  const columns = meta.columns.filter((column) => Object.hasOwn(row, column));
  if (!columns.length) return;
  const values = columns.map((column) => row[column]);
  let sql = `insert into ${qi(schema)}.${qi(table)} (${columns.map(qi).join(',')}) values (${columns.map((_, index) => `$${index + 1}`).join(',')})`;
  if (upsert && meta.primary.length) {
    const mutable = columns.filter((column) => !meta.primary.includes(column));
    sql += ` on conflict (${meta.primary.map(qi).join(',')}) do ${mutable.length ? `update set ${mutable.map((column) => `${qi(column)}=excluded.${qi(column)}`).join(',')}` : 'nothing'}`;
  }
  await client.query(sql, values);
}

async function mergeTable(table, sinceIso) {
  const meta = await tableMetadata(table);
  if (!meta.cursor || !sinceIso) {
    await replaceTable(table, await restRows(table, 'select=*'));
    return;
  }
  const query = `select=*&${meta.cursor}=gte.${encodeURIComponent(sinceIso)}&order=${meta.cursor}.asc`;
  const rows = await restRows(table, query);
  if (!rows.length) return;
  const client = await getVibePool().connect();
  try {
    await client.query('begin');
    for (const row of rows) await insertRow(client, table, meta, row, true);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally { client.release(); }
}

async function metadata() {
  const pool = getVibePool();
  await pool.query(`create table if not exists ${qi(schema)}._mirror_state (key text primary key, value jsonb not null, updated_at timestamptz not null default now())`);
  const result = await pool.query(`select value from ${qi(schema)}._mirror_state where key='supabase'`);
  return result.rows[0]?.value || {};
}
async function saveMetadata(value) {
  await getVibePool().query(`insert into ${qi(schema)}._mirror_state(key,value,updated_at) values('supabase',$1::jsonb,now()) on conflict(key) do update set value=excluded.value,updated_at=now()`, [JSON.stringify(value)]);
}

async function syncMembership(sourceSignals) {
  await replaceTable('ly_org_members', await restRows('ly_org_members', 'select=*'));
  await replaceTable('ly_change_signals', sourceSignals);
}

async function mirrorOnce({ startup = false } = {}) {
  if (running || stopped || process.env.VIBE_SUPABASE_MIRROR !== '1') return;
  if (!startup && !isActiveHour()) return;
  running = true;
  try {
    const state = await metadata();
    const now = new Date();
    const needsReconcile = !state.lastFullAt || now.getTime() - Date.parse(state.lastFullAt) >= reconcileMs;
    const sourceSignals = await restRows('ly_change_signals', 'select=org_id,domain,revision,changed_at');
    const previous = state.revisions || {};
    const changedDomains = new Set();
    const nextRevisions = {};
    for (const signal of sourceSignals) {
      const key = `${signal.org_id}:${signal.domain}`;
      nextRevisions[key] = Number(signal.revision || 0);
      if (nextRevisions[key] !== Number(previous[key] || 0)) changedDomains.add(signal.domain);
    }
    const tables = needsReconcile
      ? businessTables
      : [...new Set([...changedDomains].flatMap((domain) => domainTables[domain] || businessTables))];
    const sinceIso = state.lastSyncAt ? new Date(Date.parse(state.lastSyncAt) - 120_000).toISOString() : '';
    for (const table of tables) await mergeTable(table, needsReconcile ? '' : sinceIso);
    await syncMembership(sourceSignals);
    await saveMetadata({ revisions: nextRevisions, lastSyncAt: now.toISOString(), lastFullAt: needsReconcile ? now.toISOString() : state.lastFullAt });
    invalidateSnapshot();
    if (tables.length) console.log(`[mirror] synchronized ${tables.length} table(s); full=${needsReconcile}`);
  } catch (error) {
    console.error(`[mirror] failed (${error?.code || 'UNKNOWN'}): ${safeMessage(error)}`);
  } finally { running = false; }
}

export function startSupabaseMirror() {
  if (process.env.VIBE_SUPABASE_MIRROR !== '1' || timer) return;
  void mirrorOnce({ startup: true });
  timer = setInterval(() => void mirrorOnce(), intervalMs);
  timer.unref?.();
  console.log('[mirror] enabled: 30s active polling, quiet 00:00-06:00 Asia/Ho_Chi_Minh');
}

export function stopSupabaseMirror() {
  stopped = true;
  if (timer) clearInterval(timer);
  timer = undefined;
}
