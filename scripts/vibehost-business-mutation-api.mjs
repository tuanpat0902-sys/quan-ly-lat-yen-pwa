import { randomUUID } from 'node:crypto';
import { getVibePool } from './vibehost-db.mjs';
import { authenticatedVibeUser } from './vibehost-auth-api.mjs';
import { invalidateSnapshot } from './vibehost-snapshot-api.mjs';
import { ensureIngredientCategoryColumn } from './vibehost-ingredient-category-api.mjs';
import { rebuildVibeIposInventory } from './vibehost-ipos-worker.mjs';

const schema='lat_yen_shadow_20260905',metaCache=new Map();
function qi(value){return `"${String(value).replaceAll('"','""')}"`;}
function json(response,status,payload){const body=Buffer.from(JSON.stringify(payload));response.writeHead(status,{'cache-control':'no-store','content-length':body.length,'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'});response.end(body);}
async function readBody(request){const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;if(size>131072)throw new Error('Payload too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
function uuid(value){const text=String(value||'');return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)?text:'';}
function number(value,fallback=0){const result=Number(value);return Number.isFinite(result)?result:fallback;}
async function columns(table){if(metaCache.has(table))return metaCache.get(table);const result=await getVibePool().query('select column_name from information_schema.columns where table_schema=$1 and table_name=$2',[schema,table]);const value=new Set(result.rows.map(row=>row.column_name));metaCache.set(table,value);return value;}
async function upsert(client,table,row){const allowed=await columns(table),data={...row};if(allowed.has('created_at')&&!data.created_at)data.created_at=new Date().toISOString();if(allowed.has('updated_at'))data.updated_at=new Date().toISOString();const names=Object.keys(data).filter(key=>allowed.has(key)&&data[key]!==undefined),mutable=names.filter(key=>key!=='id'&&key!=='created_at');const sql=`insert into ${qi(schema)}.${qi(table)}(${names.map(qi).join(',')}) values(${names.map((_,index)=>`$${index+1}`).join(',')}) on conflict(id) do update set ${mutable.map(key=>`${qi(key)}=excluded.${qi(key)}`).join(',')} returning *`;return (await client.query(sql,names.map(key=>data[key]))).rows[0];}
async function insert(client,table,row){const allowed=await columns(table),data={...row};if(allowed.has('id')&&!data.id)data.id=randomUUID();if(allowed.has('created_at')&&!data.created_at)data.created_at=new Date().toISOString();if(allowed.has('updated_at'))data.updated_at=new Date().toISOString();const names=Object.keys(data).filter(key=>allowed.has(key)&&data[key]!==undefined);return (await client.query(`insert into ${qi(schema)}.${qi(table)}(${names.map(qi).join(',')}) values(${names.map((_,index)=>`$${index+1}`).join(',')}) returning *`,names.map(key=>data[key]))).rows[0];}
async function warehouseAllowed(client,orgId,warehouseId){return (await client.query(`select 1 from ${qi(schema)}.ly_warehouses where id=$1::uuid and org_id=$2::uuid and active is not false`,[warehouseId,orgId])).rowCount>0;}

async function saveIngredient(client,user,input){
  const value=input?.ingredient||{},warehouseId=uuid(value.warehouse_id),id=uuid(value.id)||randomUUID(),name=String(value.name||'').trim(),type=value.ingredient_type==='prepared'?'prepared':'purchased',category=value.inventory_category==='tool'?'tool':'ingredient';
  if(!warehouseId||!name||!await warehouseAllowed(client,user.orgId,warehouseId))throw new Error('Invalid ingredient');
  await ensureIngredientCategoryColumn();
  const row=await upsert(client,'ly_ingredients',{id,org_id:user.orgId,code:value.code||null,name,unit:String(value.unit||'').trim(),ingredient_type:type,batch_output_qty:Math.max(number(value.batch_output_qty,1),0.000001),cost:Math.max(number(value.cost),0),minimum_stock:Math.max(number(value.minimum_stock),0),active:value.active!==false,purchase_unit:String(value.purchase_unit||value.unit||'').trim(),conversion_ratio:Math.max(number(value.conversion_ratio,1),0.000001),inventory_category:category});
  await client.query(`delete from ${qi(schema)}.ly_prepared_items where org_id=$1::uuid and prepared_ingredient_id=$2::uuid`,[user.orgId,id]);
  const prepared=[];
  if(type==='prepared')for(const item of input.prepared_items||[]){const sourceId=uuid(item.source_ingredient_id),quantity=number(item.quantity);if(!sourceId||quantity<=0)continue;prepared.push(await insert(client,'ly_prepared_items',{org_id:user.orgId,prepared_ingredient_id:id,source_ingredient_id:sourceId,quantity}));}
  await client.query(`insert into ${qi(schema)}.ly_inventory(org_id,warehouse_id,ingredient_id,quantity,updated_at) values($1::uuid,$2::uuid,$3::uuid,0,now()) on conflict(org_id,warehouse_id,ingredient_id) do nothing`,[user.orgId,warehouseId,id]);
  return {id,row,prepared_items:prepared};
}

async function saveProduct(client,user,input){
  const value=input?.product||{},warehouseId=uuid(value.warehouse_id),id=uuid(value.id)||randomUUID(),name=String(value.name||'').trim();
  if(!warehouseId||!name||!await warehouseAllowed(client,user.orgId,warehouseId))throw new Error('Invalid product');
  const row=await upsert(client,'ly_products',{id,org_id:user.orgId,warehouse_id:warehouseId,name,sku:String(value.sku||'').trim()||null,unit:String(value.unit||'ly').trim()||'ly',selling_price:Math.max(number(value.selling_price),0),active:value.active!==false});
  await client.query(`delete from ${qi(schema)}.ly_recipe_items where org_id=$1::uuid and product_id=$2::uuid`,[user.orgId,id]);
  const recipe=[];
  for(const item of input.recipe_items||[]){const ingredientId=uuid(item.ingredient_id),quantity=number(item.quantity);if(!ingredientId||quantity<=0)continue;recipe.push(await insert(client,'ly_recipe_items',{org_id:user.orgId,product_id:id,ingredient_id:ingredientId,quantity}));}
  await rebuildVibeIposInventory(client,{org:user.orgId,warehouse:warehouseId});
  return {id,row,recipe_items:recipe};
}

export async function handleBusinessMutationApi(request,response,pathname){
  if(!['/api/v1/business/ingredient','/api/v1/business/product'].includes(pathname))return false;
  if(request.method!=='POST'){response.setHeader('allow','POST');json(response,405,{error:'Method Not Allowed'});return true;}
  const client=await getVibePool().connect();
  try{const user=await authenticatedVibeUser(request);if(!user){json(response,401,{error:'Authentication required'});return true;}const input=await readBody(request);await client.query('begin');const result=pathname.endsWith('/ingredient')?await saveIngredient(client,user,input):await saveProduct(client,user,input);await client.query('commit');invalidateSnapshot(user.orgId);json(response,200,result);}catch(error){await client.query('rollback').catch(()=>{});console.error(`[business-mutation] ${String(error?.message||error).slice(0,220)}`);json(response,503,{error:'Không thể lưu dữ liệu trên Vibe Host'});}finally{client.release();}return true;
}
