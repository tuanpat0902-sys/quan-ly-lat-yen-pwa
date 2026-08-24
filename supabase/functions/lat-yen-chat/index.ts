import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
};
const jsonHeaders={...corsHeaders,'Content-Type':'application/json; charset=utf-8'};
const limits=new Map<string,{started:number,count:number}>();

function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:jsonHeaders});}
function safeString(value:unknown,max:number){return typeof value==='string'?value.trim().slice(0,max):'';}
function allowed(userId:string){
  const current=Date.now(),entry=limits.get(userId);
  if(!entry||current-entry.started>=60_000){limits.set(userId,{started:current,count:1});return true;}
  entry.count+=1;return entry.count<=12;
}
function outputText(payload:any){
  if(typeof payload?.output_text==='string')return payload.output_text.trim();
  for(const item of payload?.output||[])for(const part of item?.content||[])if(typeof part?.text==='string'&&part.text.trim())return part.text.trim();
  return '';
}

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(request.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const authorization=request.headers.get('Authorization')||'',token=authorization.replace(/^Bearer\s+/i,'').trim();
    if(!token)return json({error:'AUTH_REQUIRED'},401);
    const supabase=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_ANON_KEY')||'',{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return json({error:'INVALID_SESSION'},401);
    if(!allowed(user.id))return json({error:'RATE_LIMITED'},429);

    const body=await request.json().catch(()=>({})),message=safeString(body?.message,2000),localContext=safeString(body?.local_context,4000),warehouseName=safeString(body?.warehouse_name,200);
    const recentContext=Array.isArray(body?.recent_context)?body.recent_context.slice(-6).map((row:unknown)=>{const item=row as Record<string,unknown>;return {role:item?.role==='assistant'?'assistant':'user',content:safeString(item?.content,700)};}).filter((row:{content:string})=>row.content):[];
    if(!message)return json({error:'MESSAGE_REQUIRED'},400);
    const apiKey=Deno.env.get('OPENAI_API_KEY');
    if(!apiKey)return json({error:'AI_NOT_CONFIGURED'},503);
    const model=Deno.env.get('OPENAI_MODEL')||'gpt-5.6';
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model,
        reasoning:{effort:'low'},
        max_output_tokens:700,
        store:false,
        instructions:`Bạn là Trợ lý Lát Yên trong phần mềm quản lý kho và bán hàng. Trả lời bằng tiếng Việt tự nhiên, thân thiện, đúng trọng tâm, thường từ 2 đến 5 câu. Dùng recent_context để hiểu câu nối tiếp và tương tác qua lại như hội thoại bình thường. Khi ý người dùng chưa rõ, hãy hỏi lại một câu ngắn và đưa 2 đến 4 lựa chọn cụ thể nếu có căn cứ; không tự suy diễn. Hãy trực tiếp trả lời câu hỏi kể cả khi không có dữ liệu nội bộ; nếu thiếu dữ liệu thì giải thích hợp lý và đề xuất bước tiếp theo, tuyệt đối không bịa số liệu. Dữ liệu trong verified_local_answer đã được phần mềm tính toán: phải giữ nguyên các con số và khoảng ngày đó. Không tuyên bố đã tạo, sửa, xóa, lưu hoặc xác nhận phiếu; các thao tác này chỉ được thực hiện bằng form chính thức ở thiết bị. Không yêu cầu hoặc tiết lộ khóa API, mật khẩu hay dữ liệu nhạy cảm.`,
        input:JSON.stringify({question:message,recent_context:recentContext,warehouse:warehouseName||'Kho đang chọn',local_context:localContext||'Không có dữ liệu nội bộ kèm theo.'})
      })
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)return json({error:'AI_UPSTREAM_ERROR'},502);
    const answer=outputText(payload);
    if(!answer)return json({error:'AI_EMPTY_RESPONSE'},502);
    return json({answer,model});
  }catch(_){return json({error:'ASSISTANT_UNAVAILABLE'},500);}
});
