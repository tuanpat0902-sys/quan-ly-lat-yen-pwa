import { getVibePool } from './vibehost-db.mjs';

const schema='lat_yen_shadow_20260905';
const migration='20260922_v3_import_conversion_snapshot';
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
    for(const table of ['ly_ingredients','ly_products','ly_import_receipts','ly_export_receipts','ly_stocktake_receipts','ly_sales']){
      if(await tableExists(client,table))await client.query(`alter table ${qi(schema)}.${qi(table)} add column if not exists updated_at timestamptz not null default now()`);
    }
    if(await tableExists(client,'ly_import_items')){
      await client.query(`alter table ${qi(schema)}.${qi('ly_import_items')} add column if not exists entered_quantity numeric`);
      await client.query(`alter table ${qi(schema)}.${qi('ly_import_items')} add column if not exists entered_unit text`);
      await client.query(`alter table ${qi(schema)}.${qi('ly_import_items')} add column if not exists conversion_ratio numeric`);
    }
    let inventoryRepairs=0;
    if(await tableExists(client,'ly_inventory')&&await tableExists(client,'ly_stock_transactions')){
      const repaired=await client.query(`with ledger as(
          select org_id,warehouse_id,ingredient_id,sum(quantity)::numeric balance,
            bool_or(quantity>0) has_positive_source,
            bool_or(transaction_type='SALE' and quantity<0) has_sale_deduction
          from ${qi(schema)}.ly_stock_transactions group by org_id,warehouse_id,ingredient_id
        ), candidates as(
          select i.org_id,i.warehouse_id,i.ingredient_id,l.balance
          from ${qi(schema)}.ly_inventory i join ledger l using(org_id,warehouse_id,ingredient_id)
          where i.quantity>0 and l.balance<0 and l.has_sale_deduction and not l.has_positive_source
            and not exists(select 1 from ${qi(schema)}.ly_import_items x join ${qi(schema)}.ly_import_receipts h on h.id=x.receipt_id and h.org_id=x.org_id where x.org_id=i.org_id and h.warehouse_id=i.warehouse_id and x.ingredient_id=i.ingredient_id)
            and not exists(select 1 from ${qi(schema)}.ly_stocktake_items x join ${qi(schema)}.ly_stocktake_receipts h on h.id=x.receipt_id and h.org_id=x.org_id where x.org_id=i.org_id and h.warehouse_id=i.warehouse_id and x.ingredient_id=i.ingredient_id and x.diff_qty>0)
        ) update ${qi(schema)}.ly_inventory i set quantity=c.balance,updated_at=now() from candidates c
          where i.org_id=c.org_id and i.warehouse_id=c.warehouse_id and i.ingredient_id=c.ingredient_id returning i.ingredient_id`);
      inventoryRepairs=repaired.rowCount||0;
    }
    const applied=(await client.query(`select 1 from ${qi(schema)}.${qi('ly_runtime_migrations')} where name=$1`,[migration])).rowCount>0;
    const required=[];
    for(const [table,name,columns] of indexes){
      if(await tableExists(client,table)){await client.query(`create index if not exists ${qi(name)} on ${qi(schema)}.${qi(table)} (${columns})`);required.push(name);}
    }
    if(await tableExists(client,'ly_activity_events')){
      await client.query(`alter table ${qi(schema)}.${qi('ly_activity_events')} add column if not exists actor_email text`);
      const sequence=`${schema}.ly_activity_events_id_seq`;
      await client.query(`create sequence if not exists ${qi(schema)}.${qi('ly_activity_events_id_seq')}`);
      const max=Number((await client.query(`select coalesce(max(id),0) value from ${qi(schema)}.${qi('ly_activity_events')}`)).rows[0]?.value)||0;
      await client.query('select setval($1::regclass,$2,$3)',[sequence,Math.max(max,1),max>0]);
      await client.query(`alter table ${qi(schema)}.${qi('ly_activity_events')} alter column id set default nextval('${sequence}'::regclass)`);
    }
    const missing=(await client.query(`select required.name from unnest($1::text[]) required(name) left join pg_indexes p on p.schemaname=$2 and p.indexname=required.name where p.indexname is null`,[required,schema])).rows;
    if(missing.length)throw new Error(`Required indexes missing: ${missing.map(row=>row.name).join(',')}`);
    if(!applied)await client.query(`insert into ${qi(schema)}.${qi('ly_runtime_migrations')}(name) values($1)`,[migration]);
    await client.query('commit');
    console.log(`[schema] ready: ${migration}${applied?' (already applied)':''}; inventory repairs=${inventoryRepairs}`);
  }catch(error){
    await client.query('rollback').catch(()=>{});
    throw error;
  }finally{client.release();}
}
