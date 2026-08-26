(()=>{
  'use strict';
  const VERSION='2026.08.27.1';
  if(window.__lyChatLegacyInventoryUnitGuard?.version===VERSION)return;
  const text=value=>String(value??'').replace(/\u2060/g,'').replace(/\s+/g,' ').trim();
  const valid=value=>{const v=text(value);return !!v&&v.length<=16&&/^[\p{L}\p{M}0-9%./-]+(?:\s+[\p{L}\p{M}0-9%./-]+)?$/u.test(v)&&!/g0/i.test(v);};
  function coreIngredients(){try{const rows=window.__lyFreshCoreV2?.store?.getState?.()?.ingredients;return Array.isArray(rows)?rows:[];}catch(_){return [];}}
  function legacyIngredients(){try{return Array.isArray(window.db?.ingredients)?window.db.ingredients:[]}catch(_){return [];}}
  function sync(){
    const core=coreIngredients(),legacy=legacyIngredients();if(!legacy.length)return {checked:0,repaired:0};
    const byId=new Map(core.filter(row=>row?.id).map(row=>[String(row.id),row]));let repaired=0;
    for(const row of legacy){
      const canonical=byId.get(String(row?.id||'')),current=text(row?.unit),source=text(canonical?.unit);
      if(valid(source)&&current!==source){row.unit=source;repaired++;continue;}
      if(!valid(current)){row.unit=valid(source)?source:'';repaired++;}
      const currentPurchase=text(row?.purchase_unit),sourcePurchase=text(canonical?.purchase_unit);
      if(valid(sourcePurchase)&&currentPurchase!==sourcePurchase)row.purchase_unit=sourcePurchase;
      else if(currentPurchase&&!valid(currentPurchase))row.purchase_unit=valid(sourcePurchase)?sourcePurchase:'';
    }
    return {checked:legacy.length,repaired};
  }
  function capture(event){
    if(event.type==='click'&&event.target?.closest?.('#lyAssistantDrawer [data-assistant-send]'))sync();
    if(event.type==='keydown'&&event.target?.id==='lyAssistantInput'&&event.key==='Enter'&&!event.shiftKey)sync();
  }
  function boot(){sync();document.addEventListener('click',capture,true);document.addEventListener('keydown',capture,true);window.addEventListener?.('latyen:hydrated',sync);window.addEventListener?.('latyen:v2-hydrated',sync);}
  window.__lyChatLegacyInventoryUnitGuard={version:VERSION,valid,sync,status:()=>({version:VERSION,enabled:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();