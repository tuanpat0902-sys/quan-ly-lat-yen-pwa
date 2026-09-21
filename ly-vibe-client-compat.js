(()=>{
'use strict';
const VERSION='2026.09.21.2';
function retired(operation){return new Error(`Kết nối ${operation} cũ đã ngừng hoạt động; dữ liệu hiện do Vibe Host quản lý.`);}
function result(operation='truy vấn'){return Promise.resolve({data:null,error:retired(operation),count:null});}
function builder(operation='truy vấn'){
  let current=operation;
  const proxy=new Proxy({}, {get(_target,key){
    if(key==='then')return (resolve,reject)=>result(current).then(resolve,reject);
    if(key==='catch')return reject=>result(current).catch(reject);
    if(key==='finally')return callback=>result(current).finally(callback);
    return (...args)=>{if(['insert','upsert','update','delete'].includes(String(key)))current=String(key);return proxy;};
  }});
  return proxy;
}
async function session(){try{const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}),data=await response.json().catch(()=>({}));return {data:{session:response.ok?data.session||null:null},error:response.ok?null:retired('phiên đăng nhập')}}catch(error){return {data:{session:null},error};}}
function client(){return {
  __vibeCompat:true,
  auth:{getSession:session,getUser:async()=>{const value=await session();return {data:{user:value.data.session?.user||null},error:value.error};},signInWithPassword:async({email,password}={})=>{try{const response=await fetch('/api/auth/login',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})}),data=await response.json().catch(()=>({}));return response.ok?{data:{session:data.session,user:data.session?.user||null},error:null}:{data:null,error:new Error(data.error||'Đăng nhập thất bại')}}catch(error){return {data:null,error};}},signOut:async()=>{try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});return {error:null}}catch(error){return {error}}},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
  from:name=>builder(`bảng ${name}`),rpc:name=>result(`hàm ${name}`),channel:()=>({on(){return this},subscribe(){return this},unsubscribe(){}}),removeChannel(){},storage:{from:()=>({upload:()=>result('lưu tệp'),download:()=>result('tải tệp'),remove:()=>result('xóa tệp'),getPublicUrl:()=>({data:{publicUrl:''}})})}
};}
const vibeClient=client();
window.supabase={createClient:()=>vibeClient};
window.sb=vibeClient;
window.__lyVibeClientCompat={version:VERSION,client:vibeClient};
})();
