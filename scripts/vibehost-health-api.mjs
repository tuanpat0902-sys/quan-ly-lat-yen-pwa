import { getVibePool } from './vibehost-db.mjs';

const schema='lat_yen_shadow_20260905';
const qi=value=>`"${String(value).replaceAll('"','""')}"`;
function send(response,status,payload){const body=Buffer.from(JSON.stringify(payload));response.writeHead(status,{'cache-control':'no-store','content-length':body.length,'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'});response.end(body);}

export async function handleHealthApi(request,response,pathname){
  if(pathname!=='/healthz')return false;
  if(request.method!=='GET'&&request.method!=='HEAD'){response.setHeader('allow','GET, HEAD');send(response,405,{status:'method-not-allowed'});return true;}
  const started=Date.now();
  try{
    const result=await Promise.race([
      getVibePool().query(`select current_timestamp now,to_regclass($1) migrations,(select value from ${qi(schema)}.${qi('ly_runtime_sync_state')} where name='ipos_sync_health') ipos_health`,[`${schema}.ly_runtime_migrations`]),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('health-timeout')),3000)),
    ]);
    const row=result.rows[0]||{},health=(()=>{try{return JSON.parse(row.ipos_health||'{}')}catch{return {}}})();
    const payload={status:row.migrations?'ok':'degraded',database:'ready',schema:Boolean(row.migrations),latency_ms:Date.now()-started,ipos:{status:health.status||'unknown',last_success_at:health.last_success_at||null,error_code:health.error_code||null}};
    if(request.method==='HEAD'){response.writeHead(payload.status==='ok'?200:503,{'cache-control':'no-store'});response.end();return true;}
    send(response,payload.status==='ok'?200:503,payload);
  }catch(error){send(response,503,{status:'unavailable',database:'unavailable',latency_ms:Date.now()-started,error_code:String(error?.message||error)==='health-timeout'?'TIMEOUT':'DATABASE'});}
  return true;
}
