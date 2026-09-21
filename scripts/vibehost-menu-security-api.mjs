import bcrypt from 'bcryptjs';
import { getVibePool } from './vibehost-db.mjs';
import { authenticatedVibeUser } from './vibehost-auth-api.mjs';

const schema='lat_yen_shadow_20260905',table='ly_runtime_menu_security';
function qi(value){return `"${String(value).replaceAll('"','""')}"`;}
function json(response,status,payload){const body=Buffer.from(JSON.stringify(payload));response.writeHead(status,{'cache-control':'no-store','content-length':body.length,'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'});response.end(body);}
async function body(request){const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;if(size>8192)throw new Error('Payload too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}
async function ensureTable(){await getVibePool().query(`create table if not exists ${qi(schema)}.${qi(table)}(org_id uuid primary key,password_hash text not null,updated_at timestamptz not null default now(),updated_by text)`);}
async function current(orgId){await ensureTable();return (await getVibePool().query(`select password_hash from ${qi(schema)}.${qi(table)} where org_id=$1::uuid`,[orgId])).rows[0]?.password_hash||'';}

export async function handleMenuSecurityApi(request,response,pathname){
  if(pathname!=='/api/v1/security/menu')return false;
  const user=await authenticatedVibeUser(request);if(!user){json(response,401,{error:'Authentication required'});return true;}
  try{
    const hash=await current(user.orgId);
    if(request.method==='GET'){json(response,200,{enabled:Boolean(hash)});return true;}
    if(request.method!=='POST'){response.setHeader('allow','GET, POST');json(response,405,{error:'Method Not Allowed'});return true;}
    const input=await body(request),action=String(input.action||'');
    if(action==='verify'){json(response,200,{ok:Boolean(hash)&&await bcrypt.compare(String(input.password||''),hash)});return true;}
    if(action==='set'){
      const next=String(input.new_password||''),currentPassword=String(input.current_password||'');
      if(next.length<4||next.length>64){json(response,400,{error:'Mật khẩu cần từ 4 đến 64 ký tự.'});return true;}
      if(hash&&!await bcrypt.compare(currentPassword,hash)){json(response,200,{ok:false});return true;}
      const nextHash=await bcrypt.hash(next,12);await getVibePool().query(`insert into ${qi(schema)}.${qi(table)}(org_id,password_hash,updated_at,updated_by) values($1::uuid,$2,now(),$3) on conflict(org_id) do update set password_hash=excluded.password_hash,updated_at=now(),updated_by=excluded.updated_by`,[user.orgId,nextHash,user.email]);json(response,200,{ok:true});return true;
    }
    if(action==='disable'){
      if(!hash||!await bcrypt.compare(String(input.current_password||''),hash)){json(response,200,{ok:false});return true;}
      await getVibePool().query(`delete from ${qi(schema)}.${qi(table)} where org_id=$1::uuid`,[user.orgId]);json(response,200,{ok:true});return true;
    }
    json(response,400,{error:'Invalid action'});return true;
  }catch(error){console.error(`[menu-security] ${String(error?.message||error).slice(0,180)}`);json(response,503,{error:'Bảo vệ menu tạm thời không khả dụng'});return true;}
}
