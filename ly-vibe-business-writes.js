(()=>{
  'use strict';
  if(window.__lyVibeBusinessWrites)return;
  const VERSION='2026.09.08.1';
  const usesVibe=()=>location.hostname.endsWith('.tinhgon.xyz');
  async function post(path,payload){const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Vibe Host chưa xác nhận dữ liệu.');return result;}
  function settle(){invalidateDataIndexes?.();invalidateDerivedCaches?.();cacheSave?.();}

  function install(){
    if(typeof window.saveIngredient!=='function'||typeof window.saveRecipe!=='function')return false;
    const legacyIngredient=window.saveIngredient,legacyRecipe=window.saveRecipe;
    window.saveIngredient=async function(id){
      if(!usesVibe())return legacyIngredient(id);
      const nameEl=$('igName'),unitEl=$('igUnit'),otherEl=$('igUnitOther'),typeEl=$('igType'),categoryEl=$('igInventoryCategory'),minEl=$('igMin'),costEl=$('igCost'),batchEl=$('igBatchOutput'),purchaseEl=$('igPurchaseUnit'),ratioEl=$('igConversionRatio'),btn=$('igSaveBtn'),status=$('igSaveStatus');
      if(!nameEl||!unitEl||!typeEl)return alert('Không tìm thấy biểu mẫu nguyên liệu/ dụng cụ.');
      const unit=unitEl.value==='khác'?(otherEl?.value||'').trim():unitEl.value,type=typeEl.value||'purchased',lines=type==='prepared'?[...document.querySelectorAll('#preparedRecipeLines .recipe-line')].map(row=>({source_ingredient_id:row.querySelector('.prSource')?.value||'',quantity:Number(row.querySelector('.prQty')?.value||0)})).filter(row=>row.source_ingredient_id&&row.quantity>0):[];
      if(!nameEl.value.trim()||!unit)return alert('Nhập tên và đơn vị.');if(type==='prepared'&&!lines.length)return alert('Thêm ít nhất 1 nguyên liệu nguồn.');
      const batch=Math.max(Number(batchEl?.value||1),0.000001),calculatedCost=type==='prepared'?lines.reduce((sum,row)=>sum+Number(db.ingredients.find(item=>item.id===row.source_ingredient_id)?.cost||0)*row.quantity,0)/batch:Number(costEl?.value||0),payload={id:id||null,warehouse_id:currentWarehouseId,code:null,name:nameEl.value.trim(),unit,ingredient_type:type,batch_output_qty:batch,inventory_category:type==='prepared'?'ingredient':(categoryEl?.value==='tool'?'tool':'ingredient'),purchase_unit:(purchaseEl?.value||unit).trim()||unit,conversion_ratio:Math.max(Number(ratioEl?.value||1),0.000001),minimum_stock:type==='prepared'?0:Number(minEl?.value||0),cost:calculatedCost,active:true};
      try{if(btn){btn.disabled=true;btn.textContent='Đang lưu…'}if(status)status.textContent='Đang ghi trực tiếp Vibe Host…';const saved=await post('/api/v1/business/ingredient',{ingredient:payload,prepared_items:lines}),rowIndex=(db.ingredients||[]).findIndex(row=>row.id===saved.id);if(rowIndex>=0)db.ingredients[rowIndex]={...db.ingredients[rowIndex],...saved.row};else db.ingredients.push(saved.row);db.preparedItems=(db.preparedItems||[]).filter(row=>row.prepared_ingredient_id!==saved.id);db.preparedItems.push(...(saved.prepared_items||[]));if(!(db.inventory||[]).some(row=>row.warehouse_id===currentWarehouseId&&row.ingredient_id===saved.id))db.inventory.push({org_id:window.__lyFreshOrgId,warehouse_id:currentWarehouseId,ingredient_id:saved.id,quantity:0});settle();closeIngredientPanel?.();renderIngredients?.();renderRecipes?.();renderDashboard?.();toastMsg('Đã lưu nguyên liệu/ dụng cụ trên Vibe Host');}catch(error){console.error(error);if(status)status.textContent=`Lỗi: ${error?.message||error}`;}finally{if(btn){btn.disabled=false;btn.textContent='Lưu'}}
    };
    window.saveRecipe=async function(id){
      if(!usesVibe())return legacyRecipe(id);
      const nameEl=$('rpName'),priceEl=$('rpPrice'),skuEl=$('rpSku'),unitEl=$('rpUnit');if(!nameEl||!priceEl||!skuEl)return alert('Không tìm thấy biểu mẫu công thức.');const lines=[...document.querySelectorAll('#recipeLines .recipe-line')].map(row=>({ingredient_id:row.querySelector('.rlIng')?.value||'',quantity:Number(row.querySelector('.rlQty')?.value||0)})).filter(row=>row.ingredient_id&&row.quantity>0);if(!nameEl.value.trim()||!lines.length)return alert('Nhập tên món và ít nhất 1 nguyên liệu.');
      try{const product={id:id||null,warehouse_id:currentWarehouseId,name:nameEl.value.trim(),sku:skuEl.value.trim()||null,unit:(unitEl?.value||'ly').trim()||'ly',selling_price:Number(priceEl.value||0),active:true},saved=await post('/api/v1/business/product',{product,recipe_items:lines}),rowIndex=(db.products||[]).findIndex(row=>row.id===saved.id);if(rowIndex>=0)db.products[rowIndex]={...db.products[rowIndex],...saved.row};else db.products.push(saved.row);db.recipeItems=(db.recipeItems||[]).filter(row=>row.product_id!==saved.id);db.recipeItems.push(...(saved.recipe_items||[]));saveProductUnit?.(saved.id,saved.row?.unit||product.unit);assignProductToWarehouse?.(saved.id,currentWarehouseId);settle();toggleRecipeForm?.(false);renderRecipes?.();renderSales?.();renderDashboard?.();toastMsg('Đã lưu món và công thức trên Vibe Host');}catch(error){alert('Lỗi công thức: '+(error?.message||error));}
    };
    window.__lyVibeBusinessWrites={version:VERSION};return true;
  }
  const boot=()=>{if(!install())setTimeout(boot,50)};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
