export function createV2Adapter({v2,events,legacyShowTab}){
  if(!v2)throw new Error('V2 adapter requires a V2 runtime');
  const legacyNavigate=typeof legacyShowTab==='function'?legacyShowTab:null;
  return Object.freeze({
    mode:'compatibility',
    authoritative:false,
    getState:()=>v2.store?.getState?.(),
    setOrg:orgId=>v2.setOrg?.(orgId),
    setPanel:panel=>v2.setPanel?.(panel),
    navigateLegacy:(panel,button)=>legacyNavigate?.call(window,panel,button),
    emit:(type,payload)=>events?.emit?.(`v2:${type}`,payload),
    status:()=>({available:true,authoritative:false,version:v2.version||'unknown'})
  });
}
