import { randomUUID } from 'node:crypto';
import { getVibePool } from './vibehost-db.mjs';
import { authenticatedVibeUser } from './vibehost-auth-api.mjs';
import { invalidateSnapshot } from './vibehost-snapshot-api.mjs';
import { repairImpossiblePositiveInventory } from './vibehost-ipos-worker.mjs';

const schema='lat_yen_shadow_20260905';
const route='/api/v1/maintenance/purge-august-2026-sales';
const period=Object.freeze({label:'2026-08',start:'2026-07-31T17:00:00.000Z',end:'2026-08-31T17:00:00.000Z',salesFloor:'2026-09-01'});
const qi=value=>`"${String(value).replaceAll('"','""')}"`;

function send(response,status,payload){const body=Buffer.from(JSON.stringify(payload));response.writeHead(status,{'cache-control':'no-store','content-length':body.length,'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'});response.end(body);}
async function body(request){const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;if(size>16384)throw new Error('Payload too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}
async function ensureBackupTables(client){
  await client.query(`create table if not exists ${qi(schema)}.ly_runtime_cleanup_backups(id uuid primary key,org_id uuid not null,cleanup_type text not null,period_start timestamptz not null,period_end timestamptz not null,summary jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),created_by text not null)`);
  await client.query(`create table if not exists ${qi(schema)}.ly_runtime_cleanup_backup_rows(id bigserial primary key,backup_id uuid not null references ${qi(schema)}.ly_runtime_cleanup_backups(id) on delete cascade,table_name text not null,row_data jsonb not null)`);
  await client.query(`create index if not exists ly_idx_cleanup_backup_rows_backup on ${qi(schema)}.ly_runtime_cleanup_backup_rows(backup_id,table_name)`);
}
async function targetSummary(client,orgId){
  const result=await client.query(`with target as(
    select id,total_amount,source from ${qi(schema)}.ly_sales where org_id=$1::uuid and sold_at >= $2::timestamptz and sold_at < $3::timestamptz
  ), grouped as(select source,count(*)::int source_count from target group by source)
  select (select count(*)::int from target) sales,(select coalesce(sum(total_amount),0)::numeric from target) total_amount,
    (select count(*)::int from ${qi(schema)}.ly_sale_items i where i.org_id=$1::uuid and i.sale_id=any(coalesce((select array_agg(id) from target),'{}'::uuid[]))) sale_items,
    (select count(*)::int from ${qi(schema)}.ly_stock_transactions t where t.org_id=$1::uuid and t.transaction_type='SALE' and t.source_id=any(coalesce((select array_agg(id) from target),'{}'::uuid[]))) ledger_rows,
    (select count(*)::int from ${qi(schema)}.ly_activity_events e where e.org_id=$1::uuid and e.entity_table='ly_sales' and e.entity_id::text=any(coalesce((select array_agg(id::text) from target),'{}'::text[]))) activity_rows,
    (select coalesce(jsonb_object_agg(source,source_count) filter(where source is not null),'{}'::jsonb) from grouped) sources`,[orgId,period.start,period.end]);
  const row=result.rows[0]||{};
  return {period:period.label,start:period.start,end:period.end,sales:Number(row.sales||0),saleItems:Number(row.sale_items||0),ledgerRows:Number(row.ledger_rows||0),activityRows:Number(row.activity_rows||0),totalAmount:Number(row.total_amount||0),sources:row.sources||{}};
}
async function targetIds(client,orgId){return (await client.query(`select id from ${qi(schema)}.ly_sales where org_id=$1::uuid and sold_at >= $2::timestamptz and sold_at < $3::timestamptz order by sold_at,id for update`,[orgId,period.start,period.end])).rows.map(row=>row.id);}
async function backupRows(client,backupId,tableName,sql,values){await client.query(`insert into ${qi(schema)}.ly_runtime_cleanup_backup_rows(backup_id,table_name,row_data) select $1::uuid,$2,to_jsonb(source_row) from (${sql}) source_row`,[backupId,tableName,...values]);}

async function purge(client,user){
  await client.query('begin');
  try{
    await client.query('select pg_advisory_xact_lock(hashtext($1))',[`lat-yen-inventory:${user.orgId}`]);
    await ensureBackupTables(client);
    const summary=await targetSummary(client,user.orgId),ids=await targetIds(client,user.orgId),backupId=randomUUID();
    await client.query(`insert into ${qi(schema)}.ly_runtime_cleanup_backups(id,org_id,cleanup_type,period_start,period_end,summary,created_by) values($1::uuid,$2::uuid,'PURGE_SALES_PERIOD',$3::timestamptz,$4::timestamptz,$5::jsonb,$6)`,[backupId,user.orgId,period.start,period.end,JSON.stringify(summary),String(user.email||'')]);
    if(ids.length){
      const values=[user.orgId,ids];
      await backupRows(client,backupId,'ly_sales',`select * from ${qi(schema)}.ly_sales where org_id=$3::uuid and id=any($4::uuid[])`,values);
      await backupRows(client,backupId,'ly_sale_items',`select * from ${qi(schema)}.ly_sale_items where org_id=$3::uuid and sale_id=any($4::uuid[])`,values);
      await backupRows(client,backupId,'ly_stock_transactions',`select * from ${qi(schema)}.ly_stock_transactions where org_id=$3::uuid and transaction_type='SALE' and source_id=any($4::uuid[])`,values);
      await backupRows(client,backupId,'ly_activity_events',`select * from ${qi(schema)}.ly_activity_events where org_id=$3::uuid and entity_table='ly_sales' and entity_id::text=any($4::text[])`,values);
      await client.query(`delete from ${qi(schema)}.ly_activity_events where org_id=$1::uuid and entity_table='ly_sales' and entity_id::text=any($2::text[])`,values);
      await client.query(`delete from ${qi(schema)}.ly_stock_transactions where org_id=$1::uuid and transaction_type='SALE' and source_id=any($2::uuid[])`,values);
      await client.query(`delete from ${qi(schema)}.ly_sale_items where org_id=$1::uuid and sale_id=any($2::uuid[])`,values);
      await client.query(`delete from ${qi(schema)}.ly_sales where org_id=$1::uuid and id=any($2::uuid[])`,values);
    }
    await client.query(`insert into ${qi(schema)}.ly_runtime_sync_state(name,value,updated_at) values('ipos_sales_floor',$1,now()) on conflict(name) do update set value=greatest(${qi('ly_runtime_sync_state')}.value,excluded.value),updated_at=now()`,[period.salesFloor]);
    const inventoryRepairs=(await repairImpossiblePositiveInventory(client,{org:user.orgId})).length;
    await client.query(`update ${qi(schema)}.ly_runtime_cleanup_backups set summary=$2::jsonb where id=$1::uuid`,[backupId,JSON.stringify({...summary,inventoryRepairs,salesFloor:period.salesFloor})]);
    await client.query('commit');
    invalidateSnapshot(user.orgId);
    return {...summary,inventoryRepairs,salesFloor:period.salesFloor,backupId};
  }catch(error){await client.query('rollback').catch(()=>{});throw error;}
}

export async function handleMaintenanceApi(request,response,pathname){
  if(pathname!==route)return false;
  let client;
  try{
    const user=await authenticatedVibeUser(request);if(!user){send(response,401,{error:'Authentication required'});return true;}
    client=await getVibePool().connect();
    if(request.method==='GET'){send(response,200,{ok:true,preview:true,...await targetSummary(client,user.orgId)});return true;}
    if(request.method!=='POST'){response.setHeader('allow','GET, POST');send(response,405,{error:'Method Not Allowed'});return true;}
    const input=await body(request);if(input.confirm!=='DELETE SALES 2026-08'){send(response,409,{error:'Confirmation phrase mismatch'});return true;}
    send(response,200,{ok:true,preview:false,...await purge(client,user)});
  }catch(error){console.error(`[maintenance-purge-sales] ${String(error?.message||error).slice(0,240)}`);send(response,503,{error:'Không thể dọn dữ liệu bán hàng an toàn trên Vibe Host'});}finally{client?.release();}
  return true;
}

export { period };
