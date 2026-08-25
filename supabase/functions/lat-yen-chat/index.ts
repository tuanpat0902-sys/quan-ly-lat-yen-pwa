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

    const body=await request.json().catch(()=>({})),message=safeString(body?.message,2000),localContext=safeString(body?.local_context,6000),warehouseName=safeString(body?.warehouse_name,200);
    const recentContext=Array.isArray(body?.recent_context)?body.recent_context.slice(-10).map((row:unknown)=>{const item=row as Record<string,unknown>;return {role:item?.role==='assistant'?'assistant':'user',content:safeString(item?.content,900)};}).filter((row:{content:string})=>row.content):[];
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
        max_output_tokens:900,
        store:false,
        text:{verbosity:'medium'},
        instructions:`Bạn là Trợ lý Lát Yên trong phần mềm quản lý kho và bán hàng. Hãy đối thoại bằng tiếng Việt tự nhiên, thân thiện, có tính liên tục và đúng trọng tâm, thường từ 2 đến 5 câu.

Quy tắc hội thoại:
- Luôn đọc các lượt user/assistant trước đó. Câu ngắn như “hôm qua”, “còn tuần trước?”, “thế khoản chi?” là phần tiếp nối của chủ đề gần nhất, không phải câu hỏi độc lập.
- Nếu local_context có resolved_follow_up, dùng nó để hiểu ý hiện tại nhưng trả lời tự nhiên, không nhắc tên trường kỹ thuật.
- Trả lời thẳng điều người dùng hỏi trước, sau đó chủ động đề nghị 2 đến 4 hướng tiếp theo có liên quan. Không lặp lại cùng một câu mẫu hoặc ví dụ chung chung.
- Khi ý còn mơ hồ, hỏi đúng một câu ngắn và đưa lựa chọn cụ thể có căn cứ; tuyệt đối không tự suy diễn.
- Nếu đang chuẩn bị bản nháp nghiệp vụ, xác nhận rõ các chi tiết phần mềm đã đọc được và hướng dẫn người dùng chọn phần còn thiếu.

Quy tắc an toàn dữ liệu:
- verified_local_answer và các chi tiết nghiệp vụ trong local_context do phần mềm xác minh; phải giữ nguyên số liệu, khoảng ngày, tên kho và lựa chọn, không thay bằng phỏng đoán.
- Nếu không có dữ liệu nội bộ, vẫn trả lời hợp lý trong phạm vi hiểu biết chung và nói rõ giới hạn; tuyệt đối không bịa số liệu của cửa hàng.
- Không tuyên bố đã tạo, sửa, xóa, lưu hoặc xác nhận phiếu. Các thao tác chỉ xảy ra khi người dùng kiểm tra và xác nhận trên form chính thức.
- Không yêu cầu hoặc tiết lộ khóa API, mật khẩu hay dữ liệu nhạy cảm.`,
        input:[...recentContext,{role:'user',content:`Câu hỏi hiện tại: ${message}\nKho đang chọn: ${warehouseName||'Kho đang chọn'}\nNgữ cảnh đã được phần mềm xác minh: ${localContext||'Không có dữ liệu nội bộ kèm theo.'}`}]
      })
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)return json({error:'AI_UPSTREAM_ERROR'},502);
    const answer=outputText(payload);
    if(!answer)return json({error:'AI_EMPTY_RESPONSE'},502);
    return json({answer,model});
  }catch(_){return json({error:'ASSISTANT_UNAVAILABLE'},500);}
});
