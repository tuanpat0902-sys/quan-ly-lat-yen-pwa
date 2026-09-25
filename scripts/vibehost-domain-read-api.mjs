import { getVibePool } from './vibehost-db.mjs';
import { authenticatedVibeUser } from './vibehost-auth-api.mjs';

const schema='lat_yen_shadow_20260905';
const qi=value=>`"${String(value).replaceAll('"','""')}"`;
const domainTables=Object.freeze({
  core:['ly_warehouses','ly_suppliers','ly_ingredients','ly_prepared_items','ly_products','ly_recipe_items','ly_inventory'],
  documents:['ly_import_receipts','ly_import_items','ly_export_receipts','ly_export_items','ly_stocktake_receipts','ly_stocktake_items'],
  sales:['ly_sales','ly_sale_items'],
  ledger:['ly_stock_transactions'],
  cashflow:['ly_cashflow_entries'],
});
const tableDomain=new Map(Object.entries(domainTables).flatMap(([domain,tables])=>tables.map(table=>[table,domain])));
const recentDays=Math.min(730,Math.max(30,Number.parseInt(process.env.VIBE_RECENT_DAYS||'180',10)||180));

function send(response,status,payload){const body=Buffer.from(JSON.stringify(payload));response.writeHead(status,{'cache-control':'no-store','content-length':body.length,'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'});response.end(body);}
function cursorParts(value){const raw=String(value||'').trim(),split=raw.lastIndexOf('|'),id=split>0?raw.slice(split+1):'';return {time:split>0?raw.slice(0,split):raw,id:/^[0-9a-f-]{36}$/i.test(id)?id:''};}
function nextCursor(row,column){const value=row?.[column];return row?`${value instanceof Date?value.toISOString():value}|${row.id}`:null;}
async function userFor(request,response,orgId){const user=await authenticatedVibeUser(request);if(!user||user.orgId!==orgId){send(response,403,{error:'Organization access denied'});return null;}return user;}
async function revision(client,orgId){const row=(await client.query(`select coalesce(max(revision),0)::bigint value from ${qi(schema)}.ly_change_signals where org_id=$1::uuid`,[orgId])).rows[0];return Number(row?.value)||0;}
function selection(table){return ['ly_import_receipts','ly_export_receipts','ly_stocktake_receipts'].includes(table)?'*,receipt_date::text receipt_date':table==='ly_cashflow_entries'?'*,entry_date::text entry_date':'*';}
async function domainRows(client,orgId,domain){
  const result={};
  for(const table of domainTables[domain]){
    let sql=`select ${selection(table)} from ${qi(schema)}.${qi(table)} where org_id=$1::uuid`,values=[orgId];
    if(['ly_import_receipts','ly_export_receipts','ly_stocktake_receipts'].includes(table))sql+=` and receipt_date>=current_date-$2::int`,values.push(recentDays);
    else if(['ly_import_items','ly_export_items','ly_stocktake_items'].includes(table)){const header=table.replace('_items','_receipts');sql+=` and receipt_id in(select id from ${qi(schema)}.${qi(header)} where org_id=$1::uuid and receipt_date>=current_date-$2::int)`,values.push(recentDays);}
    else if(table==='ly_sales')sql+=` and sold_at>=now()-make_interval(days=>$2::int)`,values.push(recentDays);
    else if(table==='ly_sale_items')sql+=` and sale_id in(select id from ${qi(schema)}.ly_sales where org_id=$1::uuid and sold_at>=now()-make_interval(days=>$2::int))`,values.push(recentDays);
    else if(table==='ly_stock_transactions')sql+=` and created_at>=now()-make_interval(days=>$2::int)`,values.push(recentDays);
    else if(table==='ly_cashflow_entries')sql+=` and entry_date>=current_date-$2::int`,values.push(recentDays);
    result[table]=(await client.query(sql,values)).rows;
  }
  return result;
}

async function history(client,orgId,kind,url){
  const limit=Math.min(50,Math.max(1,Number.parseInt(url.searchParams.get('limit')||'50',10)||50));
  const before=cursorParts(url.searchParams.get('before'));
  const warehouse=String(url.searchParams.get('warehouse_id')||'').trim();
  const values=[orgId],scope=warehouse&&/^[0-9a-f-]{36}$/i.test(warehouse)?(values.push(warehouse),` and warehouse_id=$${values.length}::uuid`):'';
  if(kind==='sales'){
    let cursor='';if(before.time){values.push(before.time);const timeArg=values.length;if(before.id){values.push(before.id);cursor=` and (sold_at,id)<($${timeArg}::timestamptz,$${values.length}::uuid)`;}else cursor=` and sold_at<$${timeArg}::timestamptz`;}
    values.push(limit);const rows=(await client.query(`select * from ${qi(schema)}.ly_sales where org_id=$1::uuid${scope}${cursor} order by sold_at desc,id desc limit $${values.length}`,values)).rows,ids=rows.map(row=>row.id);
    const items=ids.length?(await client.query(`select * from ${qi(schema)}.ly_sale_items where org_id=$1::uuid and sale_id=any($2::uuid[])`,[orgId,ids])).rows:[];
    return {rows,items,next:rows.length===limit?nextCursor(rows.at(-1),'sold_at'):null};
  }
  const config={cashflow:['ly_cashflow_entries','entry_date'],stock:['ly_stock_transactions','created_at']}[kind];if(!config)return null;
  let cursor='';if(before.time){values.push(before.time);const timeArg=values.length,type=kind==='cashflow'?'date':'timestamptz';if(before.id){values.push(before.id);cursor=` and (${qi(config[1])},id)<($${timeArg}::${type},$${values.length}::uuid)`;}else cursor=` and ${qi(config[1])}<$${timeArg}::${type}`;}
  values.push(limit);const rows=(await client.query(`select ${selection(config[0])} from ${qi(schema)}.${qi(config[0])} where org_id=$1::uuid${scope}${cursor} order by ${qi(config[1])} desc,id desc limit $${values.length}`,values)).rows;
  return {rows,next:rows.length===limit?nextCursor(rows.at(-1),config[1]):null};
}

export async function handleDomainReadApi(request,response,pathname,url){
  const domainMatch=/^\/api\/v1\/domains\/(core|documents|sales|ledger|cashflow)$/.exec(pathname),historyMatch=/^\/api\/v1\/history\/(sales|cashflow|stock)$/.exec(pathname);if(!domainMatch&&!historyMatch)return false;
  if(request.method!=='GET'){response.setHeader('allow','GET');send(response,405,{error:'Method Not Allowed'});return true;}
  const orgId=String(url.searchParams.get('org_id')||'');if(!/^[0-9a-f-]{36}$/i.test(orgId)){send(response,400,{error:'Invalid organization'});return true;}
  let client,inTransaction=false;try{if(!await userFor(request,response,orgId))return true;client=await getVibePool().connect();if(historyMatch){const payload=await history(client,orgId,historyMatch[1],url);send(response,payload?200:404,payload||{error:'Unknown history'});return true;}
    await client.query('begin isolation level repeatable read read only');inTransaction=true;
    const current=await revision(client,orgId),known=Number(url.searchParams.get('revision')||-1);if(known===current){await client.query('commit');inTransaction=false;send(response,200,{orgId,domain:domainMatch[1],revision:current,notModified:true,tables:{}});return true;}
    const tables=await domainRows(client,orgId,domainMatch[1]);await client.query('commit');inTransaction=false;send(response,200,{orgId,domain:domainMatch[1],revision:current,recentDays,tables});
  }catch(error){if(inTransaction)await client?.query('rollback').catch(()=>{});console.error(`[domain-read] ${String(error?.message||error).slice(0,220)}`);send(response,503,{error:'Domain data temporarily unavailable'});}finally{client?.release();}return true;
}

export { domainTables, tableDomain };
