import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { getVibePool } from './vibehost-db.mjs';
import { invalidateSnapshot } from './vibehost-snapshot-api.mjs';

const schema='lat_yen_shadow_20260905';
const zoneOffset=7*60*60*1000;
const intervalMs=5*60*1000;
const detailConcurrency=5;
let timer,running=false;
const metadataCache=new Map();
const credentialNames=['ly_ipos_authorization','ly_ipos_access_token'];

function qi(value){return `"${String(value).replaceAll('"','""')}"`;}
function number(value){const parsed=Number(value||0);return Number.isFinite(parsed)?parsed:0;}
function canonical(value){const raw=String(value||'').trim();return /^EDT_(.+)_[0-9]+$/.exec(raw)?.[1]||raw;}
function safeError(error){return String(error?.message||error).replace(/(?:authorization|access_token)[^\s,}]*/gi,'[credential-redacted]').slice(0,400);}
function localDate(date=new Date()){return new Date(date.getTime()+zoneOffset).toISOString().slice(0,10);}
function dayWindow(label){const [year,month,day]=label.split('-').map(Number);const start=Date.UTC(year,month-1,day)-zoneOffset;return {label,start,end:start+86_400_000-1};}
function labels(from,to=localDate()){const result=[];let cursor=dayWindow(from).start;const end=dayWindow(to).start;for(;cursor<=end;cursor+=86_400_000)result.push(localDate(new Date(cursor)));return result;}
function activeHour(){return Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',hourCycle:'h23'}).format(new Date()))>=6;}

async function tableMeta(table){
  if(metadataCache.has(table))return metadataCache.get(table);
  const result=await getVibePool().query(`select column_name from information_schema.columns where table_schema=$1 and table_name=$2 order by ordinal_position`,[schema,table]);
  const meta=new Set(result.rows.map(row=>row.column_name));metadataCache.set(table,meta);return meta;
}
async function writeRow(client,table,row,{conflict='id'}={}){
  const meta=await tableMeta(table),now=new Date().toISOString(),data={...row};
  if(meta.has('id')&&!data.id)data.id=randomUUID();
  if(meta.has('created_at')&&!data.created_at)data.created_at=now;
  if(meta.has('updated_at'))data.updated_at=now;
  const columns=Object.keys(data).filter(key=>meta.has(key)&&data[key]!==undefined);
  const mutable=columns.filter(key=>key!==conflict&&key!=='created_at');
  const sql=`insert into ${qi(schema)}.${qi(table)} (${columns.map(qi)}) values (${columns.map((_,i)=>`$${i+1}`)}) on conflict (${qi(conflict)}) do ${mutable.length?`update set ${mutable.map(key=>`${qi(key)}=excluded.${qi(key)}`).join(',')}`:'nothing'} returning *`;
  return (await client.query(sql,columns.map(key=>data[key]))).rows[0];
}
function credentialKey(){const raw=String(process.env.VIBE_CREDENTIAL_KEY||'').trim();if(!raw)throw new Error('Vibe credential encryption is not configured');return createHash('sha256').update(raw).digest();}
function encryptCredential(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',credentialKey(),iv),body=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${body.toString('base64url')}`;}
function decryptCredential(value){const [iv,tag,body]=String(value||'').split('.').map(part=>Buffer.from(part,'base64url'));const decipher=createDecipheriv('aes-256-gcm',credentialKey(),iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(body),decipher.final()]).toString('utf8');}
async function storedCredentials(client){
  await client.query(`create table if not exists ${qi(schema)}.${qi('ly_runtime_secrets')}(name text primary key,encrypted_value text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`);
  const result=await client.query(`select name,encrypted_value from ${qi(schema)}.${qi('ly_runtime_secrets')} where name=any($1::text[])`,[credentialNames]);
  return Object.fromEntries(result.rows.map(row=>[row.name,decryptCredential(row.encrypted_value)]));
}
async function bootstrapCredentials(client){
  const source=String(process.env.MIGRATION_SOURCE_DATABASE_URL||'').trim();if(!source)return {};
  const sourcePool=new pg.Pool({connectionString:source,ssl:{rejectUnauthorized:false},max:1,connectionTimeoutMillis:10_000});
  try{const result=await sourcePool.query('select name,decrypted_secret from vault.decrypted_secrets where name=any($1::text[])',[credentialNames]);for(const row of result.rows)await client.query(`insert into ${qi(schema)}.${qi('ly_runtime_secrets')}(name,encrypted_value,updated_at) values($1,$2,now()) on conflict(name) do update set encrypted_value=excluded.encrypted_value,updated_at=now()`,[row.name,encryptCredential(row.decrypted_secret)]);if(result.rows.length===credentialNames.length)console.log('[ipos-vibe] imported iPOS credentials into encrypted Vibe storage');return Object.fromEntries(result.rows.map(row=>[row.name,row.decrypted_secret]));}finally{await sourcePool.end();}
}
async function iposConfig(client){
  const value=name=>String(process.env[name]||'').trim();
  let stored={};if(!value('IPOS_AUTHORIZATION')||!value('IPOS_ACCESS_TOKEN')){stored=await storedCredentials(client);if(!stored.ly_ipos_authorization||!stored.ly_ipos_access_token)stored={...stored,...await bootstrapCredentials(client)};}
  const config={authorization:value('IPOS_AUTHORIZATION')||stored.ly_ipos_authorization,accessToken:value('IPOS_ACCESS_TOKEN')||stored.ly_ipos_access_token,companyUid:value('IPOS_COMPANY_UID'),brandUid:value('IPOS_BRAND_UID'),cityUid:value('IPOS_CITY_UID'),storeUid:value('IPOS_STORE_UID')};
  if(Object.values(config).some(item=>!item))throw new Error('iPOS credentials/configuration are incomplete');
  return config;
}
function headers(config){return {accept:'application/json, text/plain, */*',authorization:config.authorization,access_token:config.accessToken,fabi_type:'pos-cms',origin:'https://fabi.ipos.vn',referer:'https://fabi.ipos.vn/','accept-language':'vi','x-client-timezone':String(zoneOffset),'user-agent':'lat-yen-vibe-ipos/1.0'};}
async function iposJson(url,config){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30_000);try{const response=await fetch(url,{headers:headers(config),signal:controller.signal});if(!response.ok)throw new Error(`iPOS ${response.status}: ${(await response.text()).slice(0,200)}`);return response.json();}finally{clearTimeout(timeout);}}
function arrayPayload(payload){if(Array.isArray(payload))return payload;for(const key of ['data','result','items','sales'])if(Array.isArray(payload?.[key]))return payload[key];throw new Error('Unexpected iPOS array response');}
function objectPayload(payload){const data=payload?.data;return data&&typeof data==='object'&&!Array.isArray(data)?data:null;}
async function catalog(config,endpoint){const url=new URL(`https://posapi.ipos.vn/api/mdata/v1/${endpoint}`);url.searchParams.set('skip_limit','true');for(const key of ['companyUid','brandUid','cityUid'])url.searchParams.set(key.replace('Uid','_uid'),config[key]);return arrayPayload(await iposJson(url,config));}
async function saleHeaders(config,window){const rows=[],seen=new Set();for(let page=1;page<=100;page++){const url=new URL('https://posapi.ipos.vn/api/reports_v1/v3/pos-cms/report/sale-by-date');for(const [key,value] of Object.entries({company_uid:config.companyUid,brand_uid:config.brandUid,store_uid:config.storeUid,page,start_date:window.start,end_date:window.end,sort:'dsc',store_open_at:'0'}))url.searchParams.set(key,String(value));const current=arrayPayload(await iposJson(url,config));if(!current.length)break;const signature=current.map(row=>row.tran_id||'').join('|');if(seen.has(signature))break;seen.add(signature);rows.push(...current);}return [...new Map(rows.filter(row=>row.tran_id).map(row=>[String(row.tran_id),row])).values()];}
async function saleDetail(config,header,window){const url=new URL('https://posapi.ipos.vn/api/v1/reports/sales/get-sale-by-tran-id');for(const [key,value] of Object.entries({company_uid:config.companyUid,brand_uid:config.brandUid,store_uid:config.storeUid,start_date:window.start,end_date:window.end,tran_id:header.tran_id}))url.searchParams.set(key,String(value));const detail=objectPayload(await iposJson(url,config));if(!detail)throw new Error(`Missing detail for ${header.tran_id}`);return {...header,...detail};}

async function context(client){
  const org=(await client.query(`select org_id from ${qi(schema)}.ly_org_members order by created_at nulls last limit 1`)).rows[0]?.org_id||(await client.query(`select org_id from ${qi(schema)}.ly_sales limit 1`)).rows[0]?.org_id;
  if(!org)throw new Error('No organization exists in Vibe database');
  const warehouse=(await client.query(`select id from ${qi(schema)}.ly_warehouses where org_id=$1 and active is not false order by created_at nulls last limit 1`,[org])).rows[0]?.id;
  if(!warehouse)throw new Error('No active warehouse exists in Vibe database');
  return {org,warehouse};
}
async function upsertProduct(client,ctx,item,extra={}){
  const itemId=String(item.item_id||'').trim(),name=String(item.item_name||'').trim();if(!itemId||!name)return null;
  let id=(await client.query(`select id from ${qi(schema)}.ly_products where org_id=$1 and ipos_item_id=$2 limit 1`,[ctx.org,itemId])).rows[0]?.id||randomUUID();
  return writeRow(client,'ly_products',{id,org_id:ctx.org,warehouse_id:ctx.warehouse,name,sku:itemId,unit:item.unit_name||item.unit||'Món',selling_price:number(item.price??item.price_org??item.ots_price??item.ta_price),active:item.deleted===true?false:item.active!==false,ipos_item_id:itemId,ipos_item_type_id:extra.item_type_id??item.item_type_id??null,ipos_item_type_name:extra.item_type_name??item.item_type_name??null,ipos_item_class_id:extra.item_class_id??item.item_class_id??null,ipos_item_class_name:extra.item_class_name??item.item_class_name??null,ipos_last_synced_at:new Date().toISOString()});
}
async function syncCatalog(client,ctx,config){
  const [items,types,classes,units]=await Promise.all(['items','item-types','item-classes','units'].map(name=>catalog(config,name)));
  const maps=list=>new Map(list.map(row=>[String(row.id||''),row])),typeMap=maps(types),classMap=maps(classes),unitMap=maps(units);
  for(const item of items){const type=typeMap.get(String(item.item_type_uid||'')),itemClass=classMap.get(String(item.item_class_uid||'')),unit=unitMap.get(String(item.unit_uid||''));await upsertProduct(client,ctx,{...item,unit_name:unit?.unit_name},{item_type_id:type?.item_type_id,item_type_name:type?.item_type_name,item_class_id:itemClass?.item_class_id,item_class_name:itemClass?.item_class_name});}
  return items.length;
}
async function upsertSale(client,ctx,config,sale){
  const tranId=canonical(sale.tran_id),receiptNo=String(sale.tran_no||'').trim();if(!tranId||!receiptNo)return null;
  let id=(await client.query(`select id from ${qi(schema)}.ly_sales where org_id=$1 and ipos_tran_id=$2 limit 1`,[ctx.org,tranId])).rows[0]?.id||randomUUID();
  const subtotal=Math.max(number(sale.amount_origin),0),total=Math.max(number(sale.total_amount),0),itemDiscount=Math.max(number(sale.amount_discount_detail),0),discount=Math.max(number(sale.discount_extra_amount)+itemDiscount,subtotal-total,0),receiptDiscount=Math.max(discount-itemDiscount,0);
  const soldAt=sale.tran_date?new Date(number(sale.tran_date)).toISOString():new Date().toISOString();
  await writeRow(client,'ly_sales',{id,org_id:ctx.org,warehouse_id:ctx.warehouse,receipt_no:receiptNo,sold_at:soldAt,source:'iPOS',note:sale.sale_note||'',subtotal,discount_type:'amount',discount_value:receiptDiscount,receipt_discount:receiptDiscount,item_discount_total:itemDiscount,discount,total_amount:total,ipos_tran_id:tranId,ipos_store_uid:config.storeUid,ipos_sale_updated_at:sale.sale_updated_at||null,ipos_payment_methods:JSON.stringify(sale.sale_payment_method||[]),ipos_last_synced_at:new Date().toISOString()});
  await client.query(`delete from ${qi(schema)}.ly_sale_items where org_id=$1 and sale_id=$2`,[ctx.org,id]);
  for(const line of Array.isArray(sale.sale_detail)?sale.sale_detail:[]){const product=await upsertProduct(client,ctx,line);if(!product)continue;const quantity=number(line.quantity),unitPrice=number(line.price),lineSubtotal=number(line.price_org)*quantity,itemDiscountValue=number(line.discount_amount);await writeRow(client,'ly_sale_items',{org_id:ctx.org,sale_id:id,product_id:product.id,quantity,unit_price:unitPrice,line_subtotal:lineSubtotal,item_discount_type:'amount',item_discount_value:itemDiscountValue,item_discount:itemDiscountValue,line_total:number(line.amount),ipos_sale_detail_id:String(line.id_sale_detail||line.id||'')||null,ipos_item_id:String(line.item_id||'')||null,ipos_toppings:JSON.stringify(line.toppings||[])});}
  return {id,soldAt};
}

async function rebuildIposInventory(client,ctx){
  const old=await client.query(`select t.warehouse_id,t.ingredient_id,sum(t.quantity)::numeric as quantity from ${qi(schema)}.ly_stock_transactions t join ${qi(schema)}.ly_sales s on s.id=t.source_id and s.org_id=t.org_id where t.org_id=$1 and s.source='iPOS' group by t.warehouse_id,t.ingredient_id`,[ctx.org]);
  await client.query(`delete from ${qi(schema)}.ly_stock_transactions t using ${qi(schema)}.ly_sales s where t.org_id=$1 and s.id=t.source_id and s.org_id=t.org_id and s.source='iPOS'`,[ctx.org]);
  const [sales,items,recipes,ingredients,prepared]=await Promise.all([
    client.query(`select * from ${qi(schema)}.ly_sales where org_id=$1 and source='iPOS'`,[ctx.org]),
    client.query(`select i.* from ${qi(schema)}.ly_sale_items i join ${qi(schema)}.ly_sales s on s.id=i.sale_id where i.org_id=$1 and s.source='iPOS'`,[ctx.org]),
    client.query(`select * from ${qi(schema)}.ly_recipe_items where org_id=$1`,[ctx.org]),
    client.query(`select * from ${qi(schema)}.ly_ingredients where org_id=$1`,[ctx.org]),
    client.query(`select * from ${qi(schema)}.ly_prepared_items where org_id=$1`,[ctx.org]),
  ]);
  const saleMap=new Map(sales.rows.map(row=>[row.id,row])),recipeMap=new Map(),ingredientMap=new Map(ingredients.rows.map(row=>[row.id,row])),preparedMap=new Map();
  for(const row of recipes.rows){if(!recipeMap.has(row.product_id))recipeMap.set(row.product_id,[]);recipeMap.get(row.product_id).push(row);}
  for(const row of prepared.rows){if(!preparedMap.has(row.prepared_ingredient_id))preparedMap.set(row.prepared_ingredient_id,[]);preparedMap.get(row.prepared_ingredient_id).push(row);}
  function expand(id,quantity,seen=new Set()){const ingredient=ingredientMap.get(id);if(ingredient?.ingredient_type!=='prepared')return new Map([[id,quantity]]);if(seen.has(id))return new Map();const next=new Set(seen).add(id),result=new Map(),batch=Math.max(number(ingredient.batch_output_qty),0.000001);for(const part of preparedMap.get(id)||[])for(const [child,value] of expand(part.source_ingredient_id,quantity*number(part.quantity)/batch,next))result.set(child,(result.get(child)||0)+value);return result;}
  const totals=new Map();
  for(const item of items.rows){const sale=saleMap.get(item.sale_id);if(!sale)continue;const needed=new Map();for(const recipe of recipeMap.get(item.product_id)||[])for(const [id,value] of expand(recipe.ingredient_id,number(item.quantity)*number(recipe.quantity)))needed.set(id,(needed.get(id)||0)+value);for(const [ingredientId,value] of needed){const quantity=-value,key=`${sale.warehouse_id}:${ingredientId}`;totals.set(key,(totals.get(key)||0)+quantity);await writeRow(client,'ly_stock_transactions',{org_id:ctx.org,warehouse_id:sale.warehouse_id,ingredient_id:ingredientId,transaction_type:'SALE',quantity,source_id:sale.id,unit_cost:0,note:`iPOS ${sale.receipt_no} — trừ theo công thức`,created_at:sale.sold_at});}}
  const oldTotals=new Map(old.rows.map(row=>[`${row.warehouse_id}:${row.ingredient_id}`,number(row.quantity)]));
  for(const key of new Set([...oldTotals.keys(),...totals.keys()])){const [warehouseId,ingredientId]=key.split(':'),delta=(totals.get(key)||0)-(oldTotals.get(key)||0);if(Math.abs(delta)<1e-9)continue;await client.query(`insert into ${qi(schema)}.ly_inventory(org_id,warehouse_id,ingredient_id,quantity,updated_at) values($1,$2,$3,$4,now()) on conflict(org_id,warehouse_id,ingredient_id) do update set quantity=${qi('ly_inventory')}.${qi('quantity')}+excluded.quantity,updated_at=now()`,[ctx.org,warehouseId,ingredientId,delta]);}
  return totals.size;
}

async function runSync({backfill=false}={}){
  if(running||process.env.VIBE_IPOS_SYNC!=='1')return;running=true;const client=await getVibePool().connect();
  try{const config=await iposConfig(client),ctx=await context(client),from=backfill?(process.env.VIBE_IPOS_BACKFILL_FROM||'2026-08-25'):localDate(),days=labels(from),summary={catalog:0,sales:0,days:days.length};await client.query('begin');summary.catalog=await syncCatalog(client,ctx,config);for(const label of days){const window=dayWindow(label),headersForDay=(await saleHeaders(config,window)).filter(row=>row.deleted!==true&&String(row.store_uid||config.storeUid)===config.storeUid),details=[];for(let i=0;i<headersForDay.length;i+=detailConcurrency)details.push(...await Promise.all(headersForDay.slice(i,i+detailConcurrency).map(row=>saleDetail(config,row,window))));for(const sale of details){await upsertSale(client,ctx,config,sale);summary.sales++;}const active=[...new Set(headersForDay.map(row=>canonical(row.tran_id)))];const dayStart=new Date(window.start).toISOString(),dayEnd=new Date(window.end).toISOString();const stale=await client.query(`select id from ${qi(schema)}.ly_sales where org_id=$1 and source='iPOS' and sold_at between $2 and $3 and not(ipos_tran_id=any($4::text[]))`,[ctx.org,dayStart,dayEnd,active]);for(const row of stale.rows){await client.query(`delete from ${qi(schema)}.ly_sale_items where org_id=$1 and sale_id=$2`,[ctx.org,row.id]);await client.query(`delete from ${qi(schema)}.ly_sales where org_id=$1 and id=$2`,[ctx.org,row.id]);}}
    summary.inventoryGroups=await rebuildIposInventory(client,ctx);await client.query('commit');invalidateSnapshot();console.log(`[ipos-vibe] synchronized ${summary.sales} sale(s), ${summary.catalog} product(s), ${summary.days} day(s)`);
  }catch(error){await client.query('rollback').catch(()=>{});console.error(`[ipos-vibe] failed: ${safeError(error)}`);}finally{client.release();running=false;}
}
export function startVibeIposWorker(){if(process.env.VIBE_IPOS_SYNC!=='1'||timer)return;void runSync({backfill:true});timer=setInterval(()=>{if(activeHour())void runSync();},intervalMs);timer.unref?.();console.log('[ipos-vibe] enabled: Vibe PostgreSQL authoritative, 5-minute active schedule');}
