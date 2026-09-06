import { createCipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getVibePool } from './vibehost-db.mjs';

const schema='lat_yen_shadow_20260905';
function qi(value){return `"${String(value).replaceAll('"','""')}"`;}
function json(response,status,payload){const body=Buffer.from(JSON.stringify(payload));response.writeHead(status,{'cache-control':'no-store','content-length':body.length,'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'});response.end(body);}
function sameSecret(actual,expected){const a=createHash('sha256').update(actual).digest(),b=createHash('sha256').update(expected).digest();return timingSafeEqual(a,b);}
function credentialKey(){const raw=String(process.env.VIBE_CREDENTIAL_KEY||'').trim();if(!raw)throw new Error('Credential encryption is unavailable');return createHash('sha256').update(raw).digest();}
function encrypt(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',credentialKey(),iv),body=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${body.toString('base64url')}`;}
async function body(request){const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;if(size>16_384)throw new Error('Payload too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}

export async function handleIposBootstrap(request,response,pathname){
  if(pathname!=='/api/internal/ipos-bootstrap')return false;
  if(request.method!=='POST'){response.setHeader('allow','POST');json(response,405,{error:'Method Not Allowed'});return true;}
  const expected=String(process.env.VIBE_IPOS_BOOTSTRAP_TOKEN||'').trim(),provided=String(request.headers['x-bootstrap-token']||'').trim();
  if(!expected||!provided||!sameSecret(provided,expected)){json(response,404,{error:'Not Found'});return true;}
  try{const payload=await body(request),authorization=String(payload.authorization||'').trim(),accessToken=String(payload.access_token||'').trim();if(!authorization||!accessToken){json(response,400,{error:'Incomplete credentials'});return true;}const pool=getVibePool();await pool.query(`create table if not exists ${qi(schema)}.${qi('ly_runtime_secrets')}(name text primary key,encrypted_value text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`);await pool.query(`insert into ${qi(schema)}.${qi('ly_runtime_secrets')}(name,encrypted_value,updated_at) values ($1,$2,now()),($3,$4,now()) on conflict(name) do update set encrypted_value=excluded.encrypted_value,updated_at=now()`,['ly_ipos_authorization',encrypt(authorization),'ly_ipos_access_token',encrypt(accessToken)]);console.log('[ipos-vibe] encrypted iPOS credentials received; bootstrap complete');json(response,200,{ok:true});}catch(error){console.error(`[ipos-vibe] bootstrap rejected: ${String(error?.message||error).slice(0,160)}`);json(response,400,{error:'Bootstrap failed'});}return true;
}
