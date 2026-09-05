import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { from as copyFrom, to as copyTo } from 'pg-copy-streams';

const { Client } = pg;
const migrationId = 'supabase-public-shadow-20260905-v1';
const targetSchema = 'lat_yen_shadow_20260905';

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function sourceConnectionConfig(connectionString) {
  return {
    connectionString,
    keepAlive: true,
    ssl: { rejectUnauthorized: false },
  };
}

function targetConnectionConfig(connectionString) {
  const hostname = new URL(connectionString).hostname;
  const isInternal = !hostname.includes('.') || hostname.endsWith('.internal');
  return {
    connectionString,
    keepAlive: true,
    ssl: isInternal ? false : { rejectUnauthorized: false },
  };
}

async function getSourceEnums(source) {
  const result = await source.query(`
    select t.typname as name,
           array_agg(e.enumlabel order by e.enumsortorder) as labels
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      join pg_enum e on e.enumtypid = t.oid
     where n.nspname = 'public'
     group by t.typname
     order by t.typname
  `);
  return result.rows;
}

async function getSourceTables(source) {
  const result = await source.query(`
    select c.relname as table_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and not c.relispartition
     order by c.relname
  `);
  return result.rows.map((row) => row.table_name);
}

async function getSourceColumns(source, tableName) {
  const result = await source.query(`
    select a.attname as column_name,
           case
             when t.typtype = 'd' then pg_catalog.format_type(t.typbasetype, t.typtypmod)
             else pg_catalog.format_type(a.atttypid, a.atttypmod)
           end as data_type,
           t.typtype as type_kind,
           tn.nspname as type_schema,
           t.typname as type_name,
           a.attnotnull as not_null,
           a.attgenerated as generated_kind
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_type t on t.oid = a.atttypid
      join pg_namespace tn on tn.oid = t.typnamespace
     where n.nspname = 'public'
       and c.relname = $1
       and a.attnum > 0
       and not a.attisdropped
     order by a.attnum
  `, [tableName]);
  return result.rows;
}

function targetDataType(column) {
  if (column.type_kind === 'e' && column.type_schema === 'public') {
    return `${quoteIdentifier(targetSchema)}.${quoteIdentifier(column.type_name)}`;
  }
  return column.data_type.replaceAll('public.', `${quoteIdentifier(targetSchema)}.`);
}

async function createTargetTable(target, tableName, columns) {
  const generated = columns.filter((column) => column.generated_kind);
  if (generated.length > 0) {
    throw new Error(`Unsupported generated columns in ${tableName}: ${generated.map((column) => column.column_name).join(', ')}`);
  }

  const definitions = columns.map((column) => {
    const nullable = column.not_null ? ' not null' : '';
    return `${quoteIdentifier(column.column_name)} ${targetDataType(column)}${nullable}`;
  });
  await target.query(
    `create table ${quoteIdentifier(targetSchema)}.${quoteIdentifier(tableName)} (${definitions.join(', ')})`,
  );
}

async function copyTable(source, target, tableName, columns) {
  const columnList = columns.map((column) => quoteIdentifier(column.column_name)).join(', ');
  const sourceSql = `copy (select ${columnList} from public.${quoteIdentifier(tableName)}) to stdout with (format csv, header false)`;
  const targetSql = `copy ${quoteIdentifier(targetSchema)}.${quoteIdentifier(tableName)} (${columnList}) from stdin with (format csv, header false)`;
  await pipeline(source.query(copyTo(sourceSql)), target.query(copyFrom(targetSql)));
}

async function addPrimaryAndUniqueConstraints(source, target, tableName) {
  const result = await source.query(`
    select conname, contype, pg_get_constraintdef(oid, true) as definition
      from pg_constraint
     where conrelid = format('%I.%I', 'public', $1)::regclass
       and contype in ('p', 'u')
     order by case contype when 'p' then 0 else 1 end, conname
  `, [tableName]);

  for (const constraint of result.rows) {
    await target.query(
      `alter table ${quoteIdentifier(targetSchema)}.${quoteIdentifier(tableName)} add constraint ${quoteIdentifier(constraint.conname)} ${constraint.definition}`,
    );
  }
}

async function tableCount(client, schema, tableName) {
  const result = await client.query(
    `select count(*)::bigint as count from ${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`,
  );
  return result.rows[0].count;
}

export async function runVibeHostShadowMigration() {
  if (process.env.VIBE_MIGRATE_FROM_SUPABASE !== '1') return;

  const sourceUrl = process.env.MIGRATION_SOURCE_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!sourceUrl || !targetUrl) {
    throw new Error('Migration requested but source or target database URL is missing');
  }
  if (sourceUrl === targetUrl) throw new Error('Source and target database URLs must differ');

  const source = new Client(sourceConnectionConfig(sourceUrl));
  const target = new Client(targetConnectionConfig(targetUrl));
  await Promise.all([source.connect(), target.connect()]);

  try {
    await Promise.all([
      source.query("set statement_timeout = '0'"),
      target.query("set statement_timeout = '0'"),
    ]);
    await source.query('set role postgres');

    const completed = await target.query(
      'select 1 from pg_namespace where nspname = $1',
      [targetSchema],
    );
    if (completed.rowCount > 0) {
      const marker = await target.query(
        `select migration_id from ${quoteIdentifier(targetSchema)}._migration_metadata where migration_id = $1`,
        [migrationId],
      ).catch(() => ({ rowCount: 0 }));
      if (marker.rowCount > 0) {
        console.log(`[migration] ${migrationId} already completed; skipping`);
        return;
      }
      throw new Error(`Target schema ${targetSchema} exists without a completion marker`);
    }

    const [enums, tables] = await Promise.all([
      getSourceEnums(source),
      getSourceTables(source),
    ]);
    console.log(`[migration] starting ${migrationId}: ${tables.length} public tables`);

    await target.query('begin');
    await target.query(`create schema ${quoteIdentifier(targetSchema)}`);
    await target.query(`set local search_path to ${quoteIdentifier(targetSchema)}, pg_catalog`);

    for (const enumType of enums) {
      const values = enumType.labels.map((label) => `'${label.replaceAll("'", "''")}'`).join(', ');
      await target.query(
        `create type ${quoteIdentifier(targetSchema)}.${quoteIdentifier(enumType.name)} as enum (${values})`,
      );
    }

    const counts = {};
    for (const tableName of tables) {
      const columns = await getSourceColumns(source, tableName);
      await createTargetTable(target, tableName, columns);
      await copyTable(source, target, tableName, columns);
      const [sourceRows, targetRows] = await Promise.all([
        tableCount(source, 'public', tableName),
        tableCount(target, targetSchema, tableName),
      ]);
      if (sourceRows !== targetRows) {
        throw new Error(`Row-count mismatch for ${tableName}: source=${sourceRows}, target=${targetRows}`);
      }
      counts[tableName] = targetRows;
      console.log(`[migration] copied ${tableName}: ${targetRows} rows`);
    }

    for (const tableName of tables) {
      await addPrimaryAndUniqueConstraints(source, target, tableName);
    }

    await target.query(`
      create table ${quoteIdentifier(targetSchema)}._migration_metadata (
        migration_id text primary key,
        source_schema text not null,
        completed_at timestamptz not null default now(),
        table_counts jsonb not null
      )
    `);
    await target.query(
      `insert into ${quoteIdentifier(targetSchema)}._migration_metadata (migration_id, source_schema, table_counts)
       values ($1, 'public', $2::jsonb)`,
      [migrationId, JSON.stringify(counts)],
    );
    await target.query('commit');
    console.log(`[migration] completed ${migrationId}: ${tables.length} tables verified`);
  } catch (error) {
    await target.query('rollback').catch(() => {});
    throw error;
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runVibeHostShadowMigration();
}
