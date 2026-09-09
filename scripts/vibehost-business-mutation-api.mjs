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
async function acquireClient(){let lastError;for(let attempt=0;attempt<3;attempt++)try{return await getVibePool().connect();}catch(error){lastError=error;await new Promise(resolve=>setTimeout(resolve,200*(attempt+1)));}throw lastError;}
async function columns(table,executor=getVibePool()){if(metaCache.has(table))return metaCache.get(table);const result=await executor.query('select column_name from information_schema.columns where table_schema=$1 and table_name=$2',[schema,table]);const value=new Set(result.rows.map(row=>row.column_name));metaCache.set(table,value);return value;}
async function upsert(client,table,row){const allowed=await columns(table,client),data={...row};if(allowed.has('created_at')&&!data.created_at)data.created_at=new Date().toISOString();if(allowed.has('updated_at'))data.updated_at=new Date().toISOString();const names=Object.keys(data).filter(key=>allowed.has(key)&&data[key]!==undefined),mutable=names.filter(key=>key!=='id'&&key!=='created_at');const sql=`insert into ${qi(schema)}.${qi(table)}(${names.map(qi).join(',')}) values(${names.map((_,index)=>`$${index+1}`).join(',')}) on conflict(id) do update set ${mutable.map(key=>`${qi(key)}=excluded.${qi(key)}`).join(',')} returning *`;return (await client.query(sql,names.map(key=>data[key]))).rows[0];}
async function insert(client,table,row){const allowed=await columns(table,client),data={...row};if(allowed.has('id')&&!data.id)data.id=randomUUID();if(allowed.has('created_at')&&!data.created_at)data.created_at=new Date().toISOString();if(allowed.has('updated_at'))data.updated_at=new Date().toISOString();const names=Object.keys(data).filter(key=>allowed.has(key)&&data[key]!==undefined);return (await client.query(`insert into ${qi(schema)}.${qi(table)}(${names.map(qi).join(',')}) values(${names.map((_,index)=>`$${index+1}`).join(',')}) returning *`,names.map(key=>data[key]))).rows[0];}
async function warehouseAllowed(client,orgId,warehouseId){return (await client.query(`select 1 from ${qi(schema)}.ly_warehouses where id=$1::uuid and org_id=$2::uuid and active is not false`,[warehouseId,orgId])).rowCount>0;}
async function ensureEmployees(executor=getVibePool()){await executor.query(`create table if not exists ${qi(schema)}.ly_employees(id uuid primary key,org_id uuid not null,warehouse_id uuid not null,legacy_id text not null,code text not null,name text not null,role text,phone text,hire_date date,shift text,attendance_mode text,base_salary numeric,hourly_rate numeric,standard_days numeric,address text,emergency_contact text,note text,bank_account text,id_number text,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(org_id,warehouse_id,code))`);}

async function saveIngredient(client,user,input){
  const value=input?.ingredient||{},warehouseId=uuid(value.warehouse_id),id=uuid(value.id)||randomUUID(),name=String(value.name||'').trim(),type=value.ingredient_type==='prepared'?'prepared':'purchased',category=value.inventory_category==='tool'?'tool':'ingredient';
  if(!warehouseId||!name||!await warehouseAllowed(client,user.orgId,warehouseId))throw new Error('Invalid ingredient');
  await ensureIngredientCategoryColumn(client);
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
  const requestedRecipe=Array.isArray(input?.recipe_items)?input.recipe_items:[],validRecipe=requestedRecipe.map(item=>({ingredient_id:uuid(item?.ingredient_id),quantity:number(item?.quantity)})).filter(item=>item.ingredient_id&&item.quantity>0);
  if(!validRecipe.length||validRecipe.length!==requestedRecipe.length)throw new Error('Invalid recipe items');
  const row=await upsert(client,'ly_products',{id,org_id:user.orgId,warehouse_id:warehouseId,name,sku:String(value.sku||'').trim()||null,unit:String(value.unit||'ly').trim()||'ly',selling_price:Math.max(number(value.selling_price),0),active:value.active!==false});
  await client.query(`delete from ${qi(schema)}.ly_recipe_items where org_id=$1::uuid and product_id=$2::uuid`,[user.orgId,id]);
  for(const item of validRecipe)await insert(client,'ly_recipe_items',{org_id:user.orgId,product_id:id,ingredient_id:item.ingredient_id,quantity:item.quantity});
  const persisted=(await client.query(`select * from ${qi(schema)}.ly_recipe_items where org_id=$1::uuid and product_id=$2::uuid order by created_at,id`,[user.orgId,id])).rows;
  if(persisted.length!==validRecipe.length)throw new Error('Recipe persistence verification failed');
  return {id,row,recipe_items:persisted,reconcile:{org:user.orgId,warehouse:warehouseId}};
}

async function reconcileProductInventory(ctx){
  let client;
  try{client=await acquireClient();await client.query('begin');await rebuildVibeIposInventory(client,ctx);await client.query('commit');invalidateSnapshot(ctx.org);}
  catch(error){if(client)await client.query('rollback').catch(()=>{});console.error(`[business-mutation-reconcile] ${String(error?.message||error).slice(0,220)}`);}
  finally{client?.release();}
}

async function saveEmployee(client,user,value){
  await ensureEmployees(client);const warehouseId=uuid(value.warehouse_id),code=String(value.code||'').trim(),name=String(value.name||'').trim();if(!warehouseId||!code||!name||!await warehouseAllowed(client,user.orgId,warehouseId))throw new Error('Invalid employee');
  const existing=(await client.query(`select id from ${qi(schema)}.ly_employees where org_id=$1::uuid and warehouse_id=$2::uuid and lower(code)=lower($3) limit 1`,[user.orgId,warehouseId,code])).rows[0],id=existing?.id||uuid(value.id)||randomUUID();
  const row=await upsert(client,'ly_employees',{id,org_id:user.orgId,warehouse_id:warehouseId,legacy_id:String(value.legacy_id||value.id||id),code,name,role:value.role||null,phone:value.phone||null,hire_date:value.hire_date||null,shift:value.shift||null,attendance_mode:['day','hour'].includes(value.attendance_mode)?value.attendance_mode:'day',base_salary:Math.max(number(value.base_salary),0),hourly_rate:Math.max(number(value.hourly_rate),0),standard_days:Math.max(number(value.standard_days,26),1),address:value.address||null,emergency_contact:value.emergency_contact||null,note:value.note||null,bank_account:value.bank_account||null,id_number:value.id_number||null,active:value.active!==false});return {id,row};
}
async function saveWarehouse(client,user,value){const id=uuid(value.id)||randomUUID(),name=String(value.name||'').trim();if(!name)throw new Error('Invalid warehouse');return {id,row:await upsert(client,'ly_warehouses',{id,org_id:user.orgId,name,address:String(value.address||''),active:value.active!==false})};}
async function saveSupplier(client,user,value){const id=uuid(value.id)||randomUUID(),name=String(value.name||'').trim();if(!name)throw new Error('Invalid supplier');return {id,row:await upsert(client,'ly_suppliers',{id,org_id:user.orgId,name,phone:String(value.phone||''),address:String(value.address||''),note:String(value.note||'')})};}
async function saveCashflow(client,user,value){const warehouseId=uuid(value.warehouse_id),id=uuid(value.id)||randomUUID();if(!warehouseId||!await warehouseAllowed(client,user.orgId,warehouseId)||!String(value.category||'').trim()||number(value.amount)<=0)throw new Error('Invalid cashflow');return {id,row:await upsert(client,'ly_cashflow_entries',{id,org_id:user.orgId,warehouse_id:warehouseId,entry_type:value.entry_type==='income'?'income':'expense',entry_date:value.entry_date||new Date().toISOString().slice(0,10),category:String(value.category).trim(),amount:number(value.amount),note:String(value.note||''),finance_scope:value.finance_scope||null})};}

async function adjustInventory(client,orgId,warehouseId,ingredientId,delta){
  if(!uuid(ingredientId)||!Number.isFinite(Number(delta))||Math.abs(Number(delta))<1e-12)return;
  await client.query(`insert into ${qi(schema)}.ly_inventory(org_id,warehouse_id,ingredient_id,quantity,updated_at) values($1::uuid,$2::uuid,$3::uuid,$4,now()) on conflict(org_id,warehouse_id,ingredient_id) do update set quantity=${qi('ly_inventory')}.quantity+excluded.quantity,updated_at=now()`,[orgId,warehouseId,ingredientId,Number(delta)]);
}
async function ensureSupplier(client,orgId,name){
  const clean=String(name||'').trim();if(!clean)return null;
  const existing=(await client.query(`select id from ${qi(schema)}.ly_suppliers where org_id=$1::uuid and lower(name)=lower($2) limit 1`,[orgId,clean])).rows[0];
  return existing?.id||(await insert(client,'ly_suppliers',{org_id:orgId,name:clean,phone:'',address:'',note:''})).id;
}
async function existingDocumentEffect(client,orgId,kind,id){
  const config={import:['ly_import_items',1],export:['ly_export_items',-1],stocktake:['ly_stocktake_items',null]}[kind],effect=new Map();if(!config||!id)return effect;
  const rows=(await client.query(`select * from ${qi(schema)}.${qi(config[0])} where org_id=$1::uuid and receipt_id=$2::uuid`,[orgId,id])).rows;
  for(const row of rows){const value=config[1]===null?number(row.diff_qty):config[1]*number(row.quantity);effect.set(row.ingredient_id,(effect.get(row.ingredient_id)||0)+value);}return effect;
}
async function saveDocument(client,user,kind,input){
  const names={import:['ly_import_receipts','ly_import_items'],export:['ly_export_receipts','ly_export_items'],stocktake:['ly_stocktake_receipts','ly_stocktake_items']}[kind];if(!names)throw new Error('Invalid document');
  const value=input?.header||{},warehouseId=uuid(value.warehouse_id),id=uuid(value.id)||randomUUID(),receiptNo=String(value.receipt_no||'').trim();if(!warehouseId||!receiptNo||!await warehouseAllowed(client,user.orgId,warehouseId))throw new Error('Invalid document');
  const previous=await existingDocumentEffect(client,user.orgId,kind,id);for(const [ingredientId,delta] of previous)await adjustInventory(client,user.orgId,warehouseId,ingredientId,-delta);
  await client.query(`delete from ${qi(schema)}.${qi(names[1])} where org_id=$1::uuid and receipt_id=$2::uuid`,[user.orgId,id]);
  const totalAmount=(input.items||[]).reduce((sum,item)=>sum+Math.max(number(item.quantity),0)*Math.max(number(item.unit_cost),0),0),header=await upsert(client,names[0],{id,org_id:user.orgId,warehouse_id:warehouseId,receipt_no:receiptNo,receipt_date:value.receipt_date||new Date().toISOString().slice(0,10),note:value.note||'',reason:value.reason||'',finance_treatment:value.finance_treatment||'inventory',total_amount:totalAmount}),items=[],importIngredients=new Set();
  for(const [index,item] of (input.items||[]).entries()){
    const ingredientId=uuid(item.ingredient_id);if(!ingredientId)continue;
    if(kind==='stocktake'){
      const current=number((await client.query(`select quantity from ${qi(schema)}.ly_inventory where org_id=$1::uuid and warehouse_id=$2::uuid and ingredient_id=$3::uuid`,[user.orgId,warehouseId,ingredientId])).rows[0]?.quantity),actual=number(item.actual_qty),diff=actual-current,ingredient=(await client.query(`select cost from ${qi(schema)}.ly_ingredients where id=$1::uuid and org_id=$2::uuid`,[ingredientId,user.orgId])).rows[0],cost=number(ingredient?.cost);items.push(await insert(client,names[1],{org_id:user.orgId,receipt_id:id,ingredient_id:ingredientId,system_qty:current,actual_qty:actual,diff_qty:diff,unit_cost:cost,diff_value:diff*cost,line_order:index+1}));await adjustInventory(client,user.orgId,warehouseId,ingredientId,diff);
    }else{
      const quantity=Math.max(number(item.quantity),0),sign=kind==='import'?1:-1,supplierId=kind==='import'?await ensureSupplier(client,user.orgId,item.supplier_name):null,unitCost=Math.max(number(item.unit_cost),0);if(quantity<=0)continue;items.push(await insert(client,names[1],{org_id:user.orgId,receipt_id:id,ingredient_id:ingredientId,supplier_id:supplierId,quantity,unit_cost:unitCost,total_cost:quantity*unitCost,line_order:index+1}));await adjustInventory(client,user.orgId,warehouseId,ingredientId,sign*quantity);if(kind==='import')importIngredients.add(ingredientId);
    }
  }
  for(const ingredientId of importIngredients)await client.query(`update ${qi(schema)}.ly_ingredients i set cost=coalesce((select sum(x.quantity*x.unit_cost)/nullif(sum(x.quantity),0) from ${qi(schema)}.ly_import_items x where x.org_id=$1::uuid and x.ingredient_id=$2::uuid),i.cost),updated_at=now() where i.org_id=$1::uuid and i.id=$2::uuid`,[user.orgId,ingredientId]);
  return {id,header,items};
}
async function saveSale(client,user,input){
  const value=input?.header||{},warehouseId=uuid(value.warehouse_id),id=uuid(value.id)||randomUUID(),receiptNo=String(value.receipt_no||'').trim();if(!warehouseId||!receiptNo||!await warehouseAllowed(client,user.orgId,warehouseId))throw new Error('Invalid sale');
  const old=(await client.query(`select ingredient_id,quantity from ${qi(schema)}.ly_stock_transactions where org_id=$1::uuid and source_id=$2::uuid and transaction_type='SALE'`,[user.orgId,id])).rows;for(const row of old)await adjustInventory(client,user.orgId,warehouseId,row.ingredient_id,-number(row.quantity));
  await client.query(`delete from ${qi(schema)}.ly_stock_transactions where org_id=$1::uuid and source_id=$2::uuid and transaction_type='SALE'`,[user.orgId,id]);await client.query(`delete from ${qi(schema)}.ly_sale_items where org_id=$1::uuid and sale_id=$2::uuid`,[user.orgId,id]);
  const row=await upsert(client,'ly_sales',{id,org_id:user.orgId,warehouse_id:warehouseId,receipt_no:receiptNo,sold_at:value.sold_at||new Date().toISOString(),source:value.source||'Tại quán',note:value.note||'',subtotal:Math.max(number(value.subtotal),0),discount:Math.max(number(value.discount),0),total_amount:Math.max(number(value.total_amount),0)}),saleItems=[],transactions=[];
  for(const item of input.sale_items||[]){const productId=uuid(item.product_id),quantity=Math.max(number(item.quantity),0);if(productId&&quantity>0)saleItems.push(await insert(client,'ly_sale_items',{org_id:user.orgId,sale_id:id,product_id:productId,quantity,unit_price:Math.max(number(item.unit_price),0),line_total:Math.max(number(item.line_total),0)}));}
  for(const item of input.stock_lines||[]){const ingredientId=uuid(item.ingredient_id),quantity=number(item.quantity);if(!ingredientId||!quantity)continue;transactions.push(await insert(client,'ly_stock_transactions',{org_id:user.orgId,warehouse_id:warehouseId,ingredient_id:ingredientId,transaction_type:'SALE',quantity,source_id:id,unit_cost:0,note:`Phiếu bán:${receiptNo}`,created_at:value.sold_at||new Date().toISOString()}));await adjustInventory(client,user.orgId,warehouseId,ingredientId,quantity);}
  return {id,row,sale_items:saleItems,transactions};
}

export async function handleBusinessMutationApi(request,response,pathname){
  const employeeMatch=/^\/api\/v1\/business\/employee\/([0-9a-f-]{36})$/i.exec(pathname),known=['/api/v1/business/ingredient','/api/v1/business/product','/api/v1/business/employees','/api/v1/business/warehouse','/api/v1/business/supplier','/api/v1/business/cashflow','/api/v1/business/import','/api/v1/business/export','/api/v1/business/stocktake','/api/v1/business/sale'];if(!known.includes(pathname)&&!employeeMatch)return false;
  let client;
  try{
    const user=await authenticatedVibeUser(request);if(!user){json(response,401,{error:'Authentication required'});return true;}
    client=await acquireClient();
    if(pathname==='/api/v1/business/employees'&&request.method==='GET'){await ensureEmployees(client);const warehouseId=uuid(new URL(request.url,'http://localhost').searchParams.get('warehouse_id'));if(!warehouseId||!await warehouseAllowed(client,user.orgId,warehouseId)){json(response,400,{error:'Invalid warehouse'});return true;}const rows=await client.query(`select * from ${qi(schema)}.ly_employees where org_id=$1::uuid and warehouse_id=$2::uuid order by active desc,name,code`,[user.orgId,warehouseId]);json(response,200,{rows:rows.rows});return true;}
    if(employeeMatch&&request.method==='DELETE'){await ensureEmployees(client);await client.query(`delete from ${qi(schema)}.ly_employees where id=$1::uuid and org_id=$2::uuid`,[employeeMatch[1],user.orgId]);invalidateSnapshot(user.orgId);json(response,200,{ok:true});return true;}
    if(request.method!=='POST'){response.setHeader('allow','GET, POST, DELETE');json(response,405,{error:'Method Not Allowed'});return true;}
    const input=await readBody(request);await client.query('begin');let result;if(pathname.endsWith('/ingredient'))result=await saveIngredient(client,user,input);else if(pathname.endsWith('/product'))result=await saveProduct(client,user,input);else if(pathname.endsWith('/warehouse'))result=await saveWarehouse(client,user,input.warehouse||{});else if(pathname.endsWith('/supplier'))result=await saveSupplier(client,user,input.supplier||{});else if(pathname.endsWith('/cashflow'))result=await saveCashflow(client,user,input.cashflow||{});else if(pathname.endsWith('/import'))result=await saveDocument(client,user,'import',input);else if(pathname.endsWith('/export'))result=await saveDocument(client,user,'export',input);else if(pathname.endsWith('/stocktake'))result=await saveDocument(client,user,'stocktake',input);else if(pathname.endsWith('/sale'))result=await saveSale(client,user,input);else result=await saveEmployee(client,user,input.employee||{});await client.query('commit');invalidateSnapshot(user.orgId);const reconcile=result?.reconcile;if(reconcile)delete result.reconcile;json(response,200,result);if(reconcile)queueMicrotask(()=>reconcileProductInventory(reconcile));
  }catch(error){if(client)await client.query('rollback').catch(()=>{});console.error(`[business-mutation] ${String(error?.message||error).slice(0,220)}`);json(response,503,{error:'Không thể lưu dữ liệu trên Vibe Host'});}finally{client?.release();}return true;
}
