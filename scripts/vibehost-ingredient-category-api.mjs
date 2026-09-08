import { getVibePool } from './vibehost-db.mjs';
import { authenticatedVibeUser } from './vibehost-auth-api.mjs';
import { invalidateSnapshot } from './vibehost-snapshot-api.mjs';

const schema='lat_yen_shadow_20260905';
function qi(value){return `"${String(value).replaceAll('"','""')}"`;}
function json(response,status,payload){const body=Buffer.from(JSON.stringify(payload));response.writeHead(status,{'cache-control':'no-store','content-length':body.length,'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'});response.end(body);}
async function body(request){const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;if(size>4096)throw new Error('Payload too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
export async function ensureIngredientCategoryColumn(executor=getVibePool()){await executor.query(`alter table ${qi(schema)}.ly_ingredients add column if not exists inventory_category text not null default 'ingredient'`);}
export async function handleIngredientCategoryApi(request,response,pathname){
  if(pathname!=='/api/v1/ingredient-category')return false;
  if(request.method!=='PATCH'){response.setHeader('allow','PATCH');json(response,405,{error:'Method Not Allowed'});return true;}
  try{
    const user=await authenticatedVibeUser(request);if(!user){json(response,401,{error:'Authentication required'});return true;}
    const input=await body(request),ingredientId=String(input.ingredient_id||''),category=String(input.inventory_category||'');
    if(!/^[0-9a-f-]{36}$/i.test(ingredientId)||!['ingredient','tool'].includes(category)){json(response,400,{error:'Invalid category'});return true;}
    await ensureIngredientCategoryColumn();
    const result=await getVibePool().query(`update ${qi(schema)}.ly_ingredients set inventory_category=$1,updated_at=now() where id=$2::uuid and org_id=$3::uuid returning id,inventory_category`,[category,ingredientId,user.orgId]);
    if(!result.rowCount){json(response,404,{error:'Ingredient not found'});return true;}
    invalidateSnapshot(user.orgId);json(response,200,{row:result.rows[0]});
  }catch(error){console.error(`[ingredient-category] ${String(error?.message||error).slice(0,180)}`);json(response,503,{error:'Unable to save category'});}return true;
}
