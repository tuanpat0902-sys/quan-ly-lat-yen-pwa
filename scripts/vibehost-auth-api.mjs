import { createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getVibePool } from './vibehost-db.mjs';

const schema='lat_yen_shadow_20260905',cookieName='ly_vibe_session';
const attempts=new Map();
function qi(value){return `"${String(value).replaceAll('"','""')}"`;}
function json(response,status,payload,headers={}){const body=Buffer.from(JSON.stringify(payload));response.writeHead(status,{'cache-control':'no-store','content-length':body.length,'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff',...headers});response.end(body);}
function secret(){const value=String(process.env.VIBE_AUTH_SECRET||'').trim();if(!value)throw new Error('Vibe authentication secret is unavailable');return value;}
function encode(value){return Buffer.from(JSON.stringify(value)).toString('base64url');}
function sign(payload){const body=`${encode({alg:'HS256',typ:'JWT'})}.${encode(payload)}`,signature=createHmac('sha256',secret()).update(body).digest('base64url');return `${body}.${signature}`;}
function verify(token){try{const [head,body,signature]=String(token||'').split('.'),expected=createHmac('sha256',secret()).update(`${head}.${body}`).digest(),actual=Buffer.from(signature,'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;const payload=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));return Number(payload.exp)>Math.floor(Date.now()/1000)?payload:null;}catch{return null;}}
function cookie(request){return Object.fromEntries(String(request.headers.cookie||'').split(';').map(part=>part.trim().split(/=(.*)/s)).filter(x=>x[0]))[cookieName];}
function remote(request){return String(request.headers['x-forwarded-for']||request.socket?.remoteAddress||'unknown').split(',')[0].trim();}
async function readBody(request){const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;if(size>4096)throw new Error('Payload too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
async function ensureTable(){await getVibePool().query(`create table if not exists ${qi(schema)}.${qi('ly_local_users')}(email text primary key,password_hash text not null,org_id uuid not null,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`);}
export async function authenticatedVibeUser(request){const payload=verify(cookie(request));if(!payload?.sub||!payload?.org_id)return null;return {id:String(payload.sub),email:String(payload.email||''),orgId:String(payload.org_id)};}
export async function handleAuthApi(request,response,pathname){
  if(!pathname.startsWith('/api/auth/'))return false;
  if(pathname==='/api/auth/login'&&request.method==='POST'){try{const key=remote(request),entry=attempts.get(key)||{count:0,since:Date.now()};if(Date.now()-entry.since>300_000){entry.count=0;entry.since=Date.now();}if(entry.count>=10){json(response,429,{error:'Thử lại sau vài phút'});return true;}const input=await readBody(request),email=String(input.email||'').trim().toLowerCase(),password=String(input.password||'');await ensureTable();const result=await getVibePool().query(`select email,password_hash,org_id from ${qi(schema)}.${qi('ly_local_users')} where email=$1 and active=true limit 1`,[email]);const row=result.rows[0];if(!row||!await bcrypt.compare(password,row.password_hash)){entry.count++;attempts.set(key,entry);json(response,401,{error:'Sai tài khoản hoặc mật khẩu'});return true;}attempts.delete(key);const now=Math.floor(Date.now()/1000),token=sign({sub:email,email,org_id:row.org_id,iat:now,exp:now+604800});json(response,200,{session:{provider:'vibe',user:{id:email,email},org_id:row.org_id}},{'set-cookie':`${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`});}catch{json(response,503,{error:'Đăng nhập tạm thời không khả dụng'});}return true;}
  if(pathname==='/api/auth/session'&&request.method==='GET'){const user=await authenticatedVibeUser(request);json(response,user?200:401,user?{session:{provider:'vibe',user:{id:user.id,email:user.email},org_id:user.orgId}}:{session:null});return true;}
  if(pathname==='/api/auth/logout'&&request.method==='POST'){json(response,200,{ok:true},{'set-cookie':`${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`});return true;}
  json(response,405,{error:'Method Not Allowed'});return true;
}
