(()=>{
  'use strict';
  if(window.__lyFreshCoreV3Runtime)return;
  const VERSION='2026.08.27.2';
  const state={version:VERSION,phase:'waiting',error:'',startedAt:Date.now(),navigationAuthoritative:false,dataCompatibility:'v2'};
  let bootPromise=null;

  async function doBoot(){
    if(window.__lyFreshCoreV3?.router?.authoritative===true){
      state.phase='ready';
      state.navigationAuthoritative=true;
      return true;
    }
    if(typeof window.showTab!=='function'||typeof window.renderPanel!=='function'||!window.__lyFreshCoreV2)return false;
    state.phase='loading';
    try{
      const legacyShowTab=window.showTab;
      const [{createFreshCoreV3},{createRouter}]=await Promise.all([
        import('./src-v3/app/bootstrap.js?v=20260827.3'),
        import('./src-v3/app/router.js?v=20260827.2')
      ]);
      if(window.__lyFreshCoreV3?.router?.authoritative===true){
        state.phase='ready';
        state.navigationAuthoritative=true;
        return true;
      }
      const v2=window.__lyFreshCoreV2;
      const orgId=String(v2?.store?.getState?.()?.orgId||window.__lyFreshOrgId||'');
      const core=createFreshCoreV3({
        supabase:window.sb,
        v2Runtime:v2,
        legacyShowTab,
        mode:'v3-shell',
        getOrgId:()=>String(v2?.store?.getState?.()?.orgId||window.__lyFreshOrgId||orgId),
        initialState:{orgId,activePanel:document.querySelector('.panel.active')?.id||'sales',migration:{mode:'v3-shell'}}
      });
      const router=createRouter({store:core.store,events:core.events,legacyNavigate:legacyShowTab});
      if(!router.install())throw new Error('V3 router could not acquire navigation ownership');
      core.setPanel(router.status().activePanel||'sales');
      window.__lyFreshCoreV3={...core,router,mode:'v3-shell',authoritative:true,authoritativeScope:['navigation','application-state'],compatibilityScope:['business-data','legacy-renderers']};
      state.navigationAuthoritative=true;
      state.phase='ready';
      window.dispatchEvent(new CustomEvent('latyen:fresh-core-v3-authoritative',{detail:{version:core.version,scope:'navigation'}}));
      return true;
    }catch(error){
      state.phase='error';
      state.error=String(error?.message||error);
      console.error('[Lát Yên] Fresh Core V3 runtime',error);
      return false;
    }
  }

  function boot(){
    if(window.__lyFreshCoreV3?.router?.authoritative===true)return Promise.resolve(true);
    if(bootPromise)return bootPromise;
    bootPromise=doBoot().finally(()=>{if(state.phase!=='loading')bootPromise=null;});
    return bootPromise;
  }

  window.__lyFreshCoreV3Runtime={version:VERSION,boot,status:()=>({...state,core:!!window.__lyFreshCoreV3,booting:!!bootPromise})};
  boot();
})();