export function createGateway({client,getOrgId,allowedTables=new Set(),allowedRpcs=new Set()}){
  if(!client?.from||!client?.rpc)throw new Error('Invalid Supabase client');
  if(typeof getOrgId!=='function')throw new Error('getOrgId is required');
  const assertTable=name=>{if(!allowedTables.has(name))throw new Error(`Table not allowed: ${name}`);};
  const assertRpc=name=>{if(!allowedRpcs.has(name))throw new Error(`RPC not allowed: ${name}`);};
  const orgId=()=>{const id=getOrgId();if(!id)throw new Error('Organization is not ready');return id;};

  async function selectPage(name,{columns='*',page=1,pageSize=50,configure}={}){
    assertTable(name);
    const from=Math.max(0,(page-1)*pageSize),to=from+Math.max(1,pageSize)-1;
    let query=client.from(name).select(columns,{count:'exact'}).eq('org_id',orgId()).range(from,to);
    if(configure)query=configure(query)??query;
    const {data,error,count}=await query;if(error)throw error;
    return {rows:data??[],count:count??0,page,pageSize};
  }

  async function rpc(name,params={}){assertRpc(name);const {data,error}=await client.rpc(name,params);if(error)throw error;return data;}
  return Object.freeze({selectPage,rpc});
}
