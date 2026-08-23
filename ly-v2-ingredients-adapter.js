(()=>{
  'use strict';
  if(window.__lyV2IngredientsAdapterV1)return;
  window.__lyV2IngredientsAdapterV1=true;

  const VERSION='2026.08.23.1';
  const state={installed:false,legacyFallbacks:0,v2Writes:0,errors:0,lastMode:'',lastSavedId:'',lastError:''};
  let legacySave=null;

  function getCore(){
    const core=window.__lyFreshCoreV2;
    return core?.domains?.ingredients?.save?core:null;
  }

  function install(){
    if(state.installed)return true;
    if(typeof window.saveIngredient!=='function')return false;
    legacySave=window.saveIngredient;

    window.saveIngredient=async function(id){
      if(typeof window.lyFreshRequireOnline==='function'&&!window.lyFreshRequireOnline())return;

      const core=getCore();
      if(!core){
        state.legacyFallbacks++;
        state.lastMode='legacy-before-v2';
        return legacySave.apply(this,arguments);
      }

      const nameEl=window.$?.('igName'),unitEl=window.$?.('igUnit'),unitOtherEl=window.$?.('igUnitOther'),
            typeEl=window.$?.('igType'),minEl=window.$?.('igMin'),costEl=window.$?.('igCost'),
            batchEl=window.$?.('igBatchOutput'),btn=window.$?.('igSaveBtn'),status=window.$?.('igSaveStatus');
      if(!nameEl||!unitEl||!typeEl)return window.alert?.('Không tìm thấy biểu mẫu nguyên liệu/ dụng cụ.');

      const unit=unitEl.value==='khác'?(unitOtherEl?.value||'').trim():unitEl.value;
      const type=typeEl.value||'purchased';
      const lines=type==='prepared'
        ?[...document.querySelectorAll('#preparedRecipeLines .recipe-line')].map(x=>({
          source_ingredient_id:x.querySelector('.prSource')?.value||'',
          quantity:Number(x.querySelector('.prQty')?.value||0)
        })).filter(x=>x.source_ingredient_id&&x.quantity>0):[];

      if(!nameEl.value.trim()||!unit)return window.alert?.('Nhập tên và đơn vị.');
      if(type==='prepared'&&!lines.length)return window.alert?.('Thêm ít nhất 1 nguyên liệu nguồn.');

      const batch=Math.max(Number(batchEl?.value||1),0.000001);
      let calculatedCost=Number(costEl?.value||0);
      if(type==='prepared'){
        calculatedCost=lines.reduce((sum,x)=>sum+Number((window.db?.ingredients||[]).find(i=>i.id===x.source_ingredient_id)?.cost||0)*x.quantity,0)/batch;
      }

      const payload={
        id:id||null,code:null,name:nameEl.value.trim(),unit,
        ingredient_type:type,batch_output_qty:batch,
        minimum_stock:type==='prepared'?0:Number(minEl?.value||0),
        cost:calculatedCost,active:true
      };

      let writeStarted=false;
      try{
        if(btn){btn.disabled=true;btn.textContent='Đang lưu Cloud…';}
        if(status)status.innerHTML='<b>Đang ghi trực tiếp Supabase…</b>';

        writeStarted=true;
        state.lastMode='v2';
        state.v2Writes++;
        const savedId=await core.domains.ingredients.save(payload,lines);
        state.lastSavedId=String(savedId||'');

        const freshRows=core.store.getState().ingredients||[];
        const verify=freshRows.find(row=>String(row?.id||'')===String(savedId||''));
        if(!verify)throw new Error('Cloud chưa xác nhận nguyên liệu.');

        if(typeof window.loadCloud==='function')await window.loadCloud();
        if(status)status.innerHTML='<span style="color:#15803d"><b>✓ Cloud đã xác nhận</b></span>';
        window.toastMsg?.('Đã lưu nguyên liệu/ dụng cụ');
        setTimeout(()=>window.closeModal?.(),350);
        return savedId;
      }catch(error){
        state.errors++;
        state.lastError=String(error?.message||error||'Unknown error');
        console.error('[Lát Yên] V2 Ingredients save',error);
        if(status){
          const safe=typeof window.esc==='function'?window.esc(state.lastError):state.lastError;
          status.innerHTML=`<span style="color:#b91c1c"><b>Lỗi:</b> ${safe}</span>`;
        }
        // Once a V2 write has started, NEVER fall back to Legacy: that could double-write.
        if(!writeStarted&&!getCore()){
          state.legacyFallbacks++;
          state.lastMode='legacy-before-write';
          return legacySave.apply(this,arguments);
        }
      }finally{
        if(btn){btn.disabled=false;btn.textContent='Lưu';}
      }
    };

    state.installed=true;
    return true;
  }

  function start(){
    if(install())return;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(install()||attempts>=40)clearInterval(timer);
    },250);
  }

  window.addEventListener('latyen:v2-shadow-ready',()=>install(),{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

  window.__lyV2IngredientsAdapter={
    version:VERSION,
    install,
    status:()=>({...state,coreReady:!!getCore()})
  };
})();
