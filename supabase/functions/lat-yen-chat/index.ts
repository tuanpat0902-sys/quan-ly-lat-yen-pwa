const CHAT_VERSION='2026.08.27.2-local-only';
const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
};
const jsonHeaders={...corsHeaders,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};

function json(body:unknown,status=200){
  return new Response(JSON.stringify(body),{status,headers:jsonHeaders});
}

Deno.serve(request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(request.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  console.log(JSON.stringify({event:'chat_local_only',chat_version:CHAT_VERSION}));
  return json({error:'LOCAL_ONLY_CHAT',chat_version:CHAT_VERSION},503);
});
