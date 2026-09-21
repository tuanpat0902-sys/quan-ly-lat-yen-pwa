import { getVibePool } from './vibehost-db.mjs';

const schema='lat_yen_shadow_20260905';
const migration='20260921_v1_runtime_indexes_and_activity_sequence';
const qi=value=>`"${String(value).replaceAll('"','""')}"`;

const indexes=[
  ['ly_warehouses','ly_idx_warehouses_org_active','org_id,active'],
  ['ly_ingredients','ly_idx_ingredients_org_active_name','org_id,active,name'],
  ['ly_inventory','ly_idx_inventory_org_warehouse','org_id,warehouse_id'],
  ['ly_products','ly_idx_products_org_warehouse_active','org_id,warehouse_id,active'],
  ['ly_recipe_items','ly_idx_recipe_items_org_product','org_id,product_id'],
  ['ly_prepared_items','ly_idx_prepared_items_org_prepared','org_id,prepared_ingredient_id'],
  ['ly_import_receipts','ly_idx_import_receipts_org_wh_date','org_id,warehouse_id,receipt_date desc'],
  ['ly_import_items','ly_idx_import_items_org_receipt','org_id,receipt_id'],
  ['ly_export_receipts','ly_idx_export_receipts_org_wh_date','org_id,warehouse_id,receipt_date desc'],
  ['ly_export_items','ly_idx_export_items_org_receipt','org_id,receipt_id'],
  ['ly_stocktake_receipts','ly_idx_stocktake_receipts_org_wh_date','org_id,warehouse_id,receipt_date desc'],
  ['ly_stocktake_items','ly_idx_stocktake_items_org_receipt','org_id,receipt_id'],
  ['ly_sales','ly_idx_sales_org_wh_sold','org_id,warehouse_id,sold_at desc'],
  ['ly_sales','ly_idx_sales_org_ipos','org_id,ipos_tran_id'],
  ['ly_sale_items','ly_idx_sale_items_org_sale','org_id,sale_id'],
  ['ly_stock_transactions','ly_idx_stock_tx_org_wh_created','org_id,warehouse_id,created_at desc'],
  ['ly_stock_transactions','ly_idx_stock_tx_org_source','org_id,source_id'],
  ['ly_cashflow_entries','ly_idx_cashflow_org_wh_date','org_id,warehouse_id,entry_date desc'],
  ['ly_activity_events','ly_idx_activity_org_id','org_id,id desc'],
  ['ly_change_signals','ly_idx_change_signals_org_domain','org_id,domain'],
];

async function tableExists(client,table){
  return Boolean((await client.query('select to_regclass($1) as name',[`${schema}.${table}`])).rows[0]?.name);
}

export async function runVibeSchemaMaintenance(){
  const client=await getVibePool().connect();
  try{
    await client.query('begin');
    await client.query("select pg_advisory_xact_lock(hashtext('lat-yen-vibe-schema-maintenance'))");
    await client.query(`create table if not exists ${qi(schema)}.${qi('ly_runtime_migrations')}(name text primary key,applied_at timestamptz not null default now())`);
    await client.query(`create table if not exists ${qi(schema)}.${qi('ly_runtime_sync_state')}(name text primary key,value text not null,updated_at timestamptz not null default now())`);
    const applied=(await client.query(`select 1 from ${qi(schema)}.${qi('ly_runtime_migrations')} where name=$1`,[migration])).rowCount>0;
    if(!applied){
      for(const [table,name,columns] of indexes){
        if(await tableExists(client,table))await client.query(`create index if not exists ${qi(name)} on ${qi(schema)}.${qi(table)} (${columns})`);
      }
      if(await tableExists(client,'ly_activity_events')){
        const sequence=`${schema}.ly_activity_events_id_seq`;
        await client.query(`create sequence if not exists ${qi(schema)}.${qi('ly_activity_events_id_seq')}`);
        const max=Number((await client.query(`select coalesce(max(id),0) value from ${qi(schema)}.${qi('ly_activity_events')}`)).rows[0]?.value)||0;
        await client.query('select setval($1::regclass,$2,$3)',[sequence,Math.max(max,1),max>0]);
        await client.query(`alter table ${qi(schema)}.${qi('ly_activity_events')} alter column id set default nextval('${sequence}'::regclass)`);
      }
      await client.query(`insert into ${qi(schema)}.${qi('ly_runtime_migrations')}(name) values($1)`,[migration]);
    }
    await client.query('commit');
    console.log(`[schema] ready: ${migration}${applied?' (already applied)':''}`);
  }catch(error){
    await client.query('rollback').catch(()=>{});
    throw error;
  }finally{client.release();}
}
