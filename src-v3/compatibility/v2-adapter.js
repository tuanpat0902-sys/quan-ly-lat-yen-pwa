export function createV2Adapter({v2,events}){
  if(!v2)throw new Error('V2 adapter requires a V2 runtime');
  return Object.freeze({
    mode:'shadow',
    getState:()=>v2.store?.getState?.(),
    setOrg:orgId=>v2.setOrg?.(orgId),
    setPanel:panel=>v2.setPanel?.(panel),
    emit:(type,payload)=>events?.emit?.(`v2:${type}`,payload),
    status:()=>({available:true,version:v2.version||'unknown'})
  });
}
