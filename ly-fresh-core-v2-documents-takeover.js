(()=>{
  'use strict';
  if(window.__lyFreshCoreV2DocumentsTakeoverV1)return;
  window.__lyFreshCoreV2DocumentsTakeoverV1=true;

  const VERSION='2026.08.23.1';
  const MAX_WAIT_MS=60000;
  const STARTED_AT=Date.now();
  const SAVE_ROUTES={
    ly_save_import:'imports',
    ly_save_export:'exports',
    ly_save_stocktake:'stocktake'
  };
  const DELETE_ROUTES=new Set(['import','export','stocktake']);
  const state={version:VERSION,phase:'waiting',enabled:false,calls:0,success:0,errors:0,fallbacks:0,lastRpc:'',lastAt:0,lastError:''};
  let client=null;
  let previousRpc=null;

  function legacySupabase(){
    try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}
    return window.sb||null;
  }

  function coreReady(){
    const core=window.__lyFreshCoreV2;
    return core?.domains?.imports?.save&&core?.domains?.exports?.save&&core?.domains?.stocktake?.save?core:null;
  }

  async function routedRpc(name,params,...rest){
    const domainName=SAVE_ROUTES[name];
    const deleteType=name==='ly_delete_receipt'?String(params?.p_type||'').toLowerCase():'';
    const isDelete=DELETE_ROUTES.has(deleteType);
    if(!domainName&&!isDelete)return previousRpc(name,params,...rest);

    state.calls++;
    state.lastRpc=name;
    state.lastAt=Date.now();
    const core=coreReady();
    if(!core){state.fallbacks++;return previousRpc(name,params,...rest);}

    try{
      let data;
      if(domainName){
        const header=params?.p_header;
        const items=Array.isArray(params?.p_items)?params.p_items:[];
        data=await core.domains[domainName].save(header,items);
      }else{
        data=await core.domains[deleteType==='stocktake'?'stocktake':deleteType].remove(params?.p_id);
      }
      state.success++;
      state.lastError='';
      window.dispatchEvent(new CustomEvent('latyen:v2-document-mutated',{detail:{rpc:name,type:domainName||deleteType,id:data||params?.p_id||'',at:state.lastAt}}));
      return {data,error:null,status:200,statusText:'OK'};
    }catch(error){
      state.errors++;
      state.lastError=String(error?.message||error||'V2 document mutation failed');
      return {data:null,error,status:400,statusText:'V2 document mutation failed'};
    }
  }

  function enable(){
    if(state.enabled)return true;
    client=legacySupabase();
    if(!client||typeof client.rpc!=='function'||!coreReady())return false;
    if(client.rpc?.__lyV2DocumentsTakeover)return true;
    previousRpc=client.rpc.bind(client);
    const wrapper=routedRpc;
    Object.defineProperty(wrapper,'__lyV2DocumentsTakeover',{value:true});
    client.rpc=wrapper;
    state.enabled=true;
    state.phase='active';
    state.lastError='';
    return true;
  }

  function disable(){
    if(client&&previousRpc&&client.rpc?.__lyV2DocumentsTakeover)client.rpc=previousRpc;
    state.enabled=false;
    state.phase='disabled';
  }

  function boot(){
    if(enable())return;
    if(Date.now()-STARTED_AT>=MAX_WAIT_MS){state.phase='idle-no-context';return;}
    setTimeout(boot,500);
  }

  window.__lyFreshCoreV2DocumentsTakeover={version:VERSION,enable,disable,status:()=>({...state})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});
  else setTimeout(boot,0);
})();
