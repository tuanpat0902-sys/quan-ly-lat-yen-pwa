(()=>{
  'use strict';
  const VERSION='2026.09.22.2';
  if(window.__lyVibeBusinessWrites?.installing||window.__lyVibeBusinessWrites?.version===VERSION)return;
  window.__lyVibeBusinessWrites={version:VERSION,installing:true};
  const usesVibe=()=>location.hostname.endsWith('.tinhgon.xyz');
  async function post(path,payload){const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Vibe Host chưa xác nhận dữ liệu.');return result;}
  async function request(path,options={}){const response=await fetch(path,{credentials:'same-origin',...options}),result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Vibe Host chưa xác nhận dữ liệu.');return result;}
  function receiptId(value){return typeof lyFreshRef==='function'?lyFreshRef(value):'';}
  function importQuantityBreakdown(m,ingredient){const ing=ingredient||db.ingredients.find(item=>item.id===m?.ingredient_id),baseQuantity=Math.abs(Number(m?._base_quantity??m?.quantity??0)),baseUnit=String(ing?.unit||'').trim(),rule=window.__lyUnitConversions?.ruleFor?.(m?.ingredient_id)||null,enteredUnit=String(m?._entered_unit||rule?.purchaseUnit||ing?.purchase_unit||baseUnit).trim()||baseUnit;let enteredQuantity=Number(m?._entered_quantity);if(!(enteredQuantity>0))enteredQuantity=window.__lyUnitConversions?.convert?.(baseQuantity,baseUnit,enteredUnit,m?.ingredient_id);if(!Number.isFinite(enteredQuantity)||enteredQuantity<=0)enteredQuantity=baseQuantity;const conversionRatio=Number(m?._conversion_ratio)||(enteredQuantity>0?baseQuantity/enteredQuantity:1),total=importTotalFromMovement(m),enteredUnitCost=total!=null&&enteredQuantity>0?Number(total)/enteredQuantity:0;return {baseQuantity,baseUnit,enteredQuantity,enteredUnit,conversionRatio,enteredUnitCost,total};}
  window.__lyImportQuantityBreakdown=importQuantityBreakdown;
  function applyDeletedReceipt(kind,result){
    const id=String(result.id||''),movementType=kind==='import'?'IMPORT':'EXPORT';
    db.movements=(db.movements||[]).filter(row=>!(String(row.reference_id||'')===id&&String(row.transaction_type||'').toUpperCase()===movementType));
    for(const changed of result.inventory||[]){const row=(db.inventory||[]).find(item=>String(item.warehouse_id)===String(changed.warehouse_id)&&String(item.ingredient_id)===String(changed.ingredient_id));if(row)row.quantity=Number(changed.quantity);else db.inventory?.push({...changed,org_id:window.__lyFreshOrgId});}
    for(const changed of result.costs||[]){const row=(db.ingredients||[]).find(item=>String(item.id)===String(changed.id));if(row)row.cost=Number(changed.cost);}
    const headers=window.__lyFreshHeaders,headerKey=kind==='import'?'imports':'exports',itemKey=kind==='import'?'importItems':'exportItems';
    if(headers){headers[headerKey]=(headers[headerKey]||[]).filter(row=>String(row.id)!==id);headers[itemKey]=(headers[itemKey]||[]).filter(row=>String(row.receipt_id)!==id);}
    window.invalidateDataIndexes?.();window.invalidateDerivedCaches?.();
    const scrollY=window.scrollY;window.renderImports?.();if(Number.isFinite(scrollY))window.scrollTo?.(0,scrollY);
    setTimeout(()=>{window.renderIngredients?.();window.renderDashboard?.();window.renderFinanceData?.();},0);
  }
  async function confirmReceiptDeletion(kind,encoded){
    const rows=kind==='import'?window.receiptRowsByKey?.(encoded):window.exportReceiptRows?.(encoded),id=receiptId(rows?.[0]?.reference_id||encoded);
    if(!id)return alert('Không xác định được mã phiếu trên Vibe Host. Chưa có dữ liệu nào bị xóa.');
    const receiptNo=kind==='import'?window.receiptNumberFromMovement?.(rows?.[0]):window.exportReceiptNumberFromMovement?.(rows?.[0]);
    if(!await window.appConfirm?.(`Xóa phiếu ${receiptNo||id} và hoàn tác tồn kho liên quan?`,'Xóa phiếu'))return false;
    let result;
    try{result=await request(`/api/v1/business/${kind}/${encodeURIComponent(id)}`,{method:'DELETE'});}
    catch(error){alert('Không thể xóa phiếu: '+(error?.message||error));return false;}
    try{applyDeletedReceipt(kind,result);window.toastMsg?.(`Đã xóa phiếu ${result.receipt_no||receiptNo||''} trên Vibe Host`);}
    catch(error){window.toastMsg?.('Phiếu đã xóa trên Vibe Host; đang tải lại danh sách.');}
    setTimeout(()=>refreshFromVibe().catch(error=>console.warn('[receipt-delete-refresh]',error)),0);
    return true;
  }
  function settle(){invalidateDataIndexes?.();invalidateDerivedCaches?.();cacheSave?.();}
  async function refreshFromVibe(){
    window.dispatchEvent?.(new CustomEvent('latyen:change-signal',{detail:{source:'vibe-write'}}));
    if(typeof window.loadCloud!=='function')throw new Error('Chưa sẵn sàng tải lại dữ liệu Cloud.');
    const deadline=Date.now()+30000;
    for(;;){
      const result=await window.loadCloud();
      if(result?.deferred){if(Date.now()>=deadline)throw new Error('Cloud đang bận. Vui lòng tải lại dữ liệu để kiểm tra.');await new Promise(resolve=>setTimeout(resolve,100));continue;}
      if(result===false||result?.ok===false)throw new Error(result?.error?.message||'Không tải lại được dữ liệu Cloud để xác nhận.');
      return result;
    }
  }
  let cashflowReadAt=0,cashflowReadWarehouse='',cashflowReadPending=null;
  const cashflowDeleting=new Set();
  function cashflowRow(row){return {id:row.id,warehouse_id:row.warehouse_id,type:row.entry_type,date:String(row.entry_date||'').slice(0,10),category:row.category,amount:Number(row.amount||0),note:row.note||'',finance_scope:row.finance_scope||undefined,created_at:row.created_at,updated_at:row.updated_at};}
  function projectCashflowRow(row){const mapped=cashflowRow(row),all=window.__lyFreshCashflow||[];window.__lyFreshCashflow=[...all.filter(item=>String(item.id)!==String(mapped.id)),mapped];window.invalidateDerivedCaches?.();}
  async function refreshCashflow(force=false){
    if(!usesVibe()||!currentWarehouseId)return false;
    if(cashflowReadPending)return cashflowReadPending;
    const warehouseId=currentWarehouseId;
    if(!force&&cashflowReadWarehouse===warehouseId&&Date.now()-cashflowReadAt<15000)return false;
    cashflowReadPending=(async()=>{
      const result=await request(`/api/v1/business/cashflow?warehouse_id=${encodeURIComponent(warehouseId)}`);
      if(currentWarehouseId!==warehouseId)return false;
      if(!Array.isArray(result.rows))throw new Error('Phản hồi lịch sử Thu/Chi không hợp lệ.');
      const existing=window.__lyFreshCashflow||[];
      const previous=existing.filter(row=>String(row.warehouse_id)===String(warehouseId));
      // The shared Cloud snapshot also feeds Finance. An empty secondary read
      // must not erase entries Finance already has while the two reads disagree.
      if(!result.rows.length&&previous.length){
        console.warn('[cashflow-history-read] Empty response conflicts with Cloud snapshot; keeping visible entries.');
        return false;
      }
      window.__lyFreshCashflow=[...existing.filter(row=>String(row.warehouse_id)!==String(warehouseId)),...result.rows.map(cashflowRow)];
      cashflowReadWarehouse=warehouseId;
      cashflowReadAt=Date.now();
      window.invalidateDerivedCaches?.();
      return true;
    })().finally(()=>{cashflowReadPending=null;});
    return cashflowReadPending;
  }
  function recipeMatches(rows,lines){const key=row=>JSON.stringify([String(row.ingredient_id),Number(row.quantity)]);return Array.isArray(rows)&&rows.length===lines.length&&JSON.stringify(rows.map(key).sort())===JSON.stringify(lines.map(key).sort());}
  function productMatches(row,product){return !!row&&['name','unit'].every(key=>String(row[key]||'')===String(product[key]||''))&&String(row.sku||'')===String(product.sku||'')&&Number(row.selling_price)===product.selling_price;}
  let recipeSaving=false;
  const employeeKey=row=>String(row?.code||'').trim().toLocaleLowerCase('vi');
  function dedupeEmployees(rows){const kept=new Map();for(const row of rows||[]){const key=employeeKey(row)||String(row?.id||'');const previous=kept.get(key);if(!previous||String(row.updated_at||row.created_at||'')>=String(previous.updated_at||previous.created_at||''))kept.set(key,row);}return [...kept.values()];}
  function fromVibeEmployee(row){return {...row,id:String(row.legacy_id||row.id),vibe_id:row.id,warehouse_id:row.warehouse_id};}
  async function syncEmployees(){if(!usesVibe()||typeof currentWarehouseId==='undefined'||!currentWarehouseId)return;const warehouseId=currentWarehouseId,cloud=await request(`/api/v1/business/employees?warehouse_id=${encodeURIComponent(warehouseId)}`);if(currentWarehouseId!==warehouseId)return;const merged=dedupeEmployees((cloud.rows||[]).map(fromVibeEmployee));saveEmployees?.(merged);renderEmployees?.();}

  function install(){
    if(typeof window.saveIngredient!=='function'||typeof window.saveRecipe!=='function')return false;
    const legacyIngredient=window.saveIngredient,legacyDeleteIngredient=window.deleteIngredient,legacyRecipe=window.saveRecipe,legacyDeleteRecipe=window.deleteRecipe,legacyWarehouse=window.saveWarehouse,legacySupplier=window.saveSupplier,legacyCashflow=window.addCashflowEntry,legacyDeleteCashflow=window.deleteCashflowEntry,legacyImport=window.saveImportReceipt,legacyExport=window.saveExportReceipt,legacyDeleteImport=window.deleteImportReceipt,legacyDeleteExport=window.deleteExportReceipt,legacyStocktake=window.saveStocktakeReceipt,legacyDeleteStocktake=window.deleteStocktakeReceipt,legacySale=window.saveSaleReceipt,legacyDeleteSale=window.deleteSaleReceipt,legacyEmployee=window.saveEmployee,legacyDeleteEmployee=window.deleteEmployee,legacyLoadEmployees=window.loadEmployees;
    if(typeof legacyEmployee!=='function'||typeof legacyDeleteEmployee!=='function'||typeof legacyLoadEmployees!=='function')return false;
    window.loadEmployees=function(){return dedupeEmployees(legacyLoadEmployees());};
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
      if(recipeSaving)return;
      const nameEl=$('rpName'),priceEl=$('rpPrice'),skuEl=$('rpSku'),unitEl=$('rpUnit'),btn=$('rpSaveBtn');if(!nameEl||!priceEl||!skuEl)return alert('Không tìm thấy biểu mẫu công thức.');const rawLines=[...document.querySelectorAll('#recipeLines .recipe-line')],invalid=rawLines.find(row=>row.querySelector('.rlIng')?.value&&Number(row.querySelector('.rlQty')?.value||0)<=0),lines=rawLines.map(row=>{const select=row.querySelector('.rlIng');return {ingredient_id:select?.value||'',ingredient_name:String(select?.selectedOptions?.[0]?.textContent||'').trim(),quantity:Number(row.querySelector('.rlQty')?.value||0)};}).filter(row=>row.ingredient_id&&row.quantity>0);if(invalid){invalid.querySelector('.rlQty')?.focus();return alert('Định lượng nguyên liệu phải lớn hơn 0.');}if(!nameEl.value.trim()||!lines.length)return alert('Nhập tên món và ít nhất 1 nguyên liệu.');
      recipeSaving=true;
      try{if(btn){btn.disabled=true;btn.textContent='Đang lưu…'}const product={id:id||null,warehouse_id:currentWarehouseId,name:nameEl.value.trim(),sku:skuEl.value.trim()||null,unit:(unitEl?.value||'ly').trim()||'ly',selling_price:Number(priceEl.value||0),active:true},saved=await post('/api/v1/business/product',{product,recipe_items:lines});if(btn)btn.setAttribute?.('onclick',`saveRecipe('${saved.id}')`);if(!Array.isArray(saved.recipe_items)||!recipeMatches(saved.recipe_items.map(row=>({...row,ingredient_id:''})),lines.map(row=>({...row,ingredient_id:''})))||saved.recipe_items.some(row=>!row.ingredient_id)||!productMatches(saved.row,product))throw new Error('Cloud chưa xác nhận đầy đủ thành phần công thức.');saveProductUnit?.(saved.id,saved.row?.unit||product.unit);assignProductToWarehouse?.(saved.id,currentWarehouseId);try{await refreshFromVibe();const persisted=(db.recipeItems||[]).filter(row=>row.product_id===saved.id);if(!recipeMatches(persisted,saved.recipe_items)||!productMatches((db.products||[]).find(row=>row.id===saved.id),product))throw new Error('Dữ liệu công thức tải lại chưa đầy đủ.');toggleRecipeForm?.(false);renderRecipes?.();renderSales?.();renderDashboard?.();toastMsg('Đã lưu món và công thức trên Vibe Host');}catch(error){toastMsg('Công thức đã lưu trên Vibe Host; danh sách đang chờ đồng bộ.');}return saved.id;}catch(error){alert('Lỗi công thức: '+(error?.message||error));return false;}finally{recipeSaving=false;if(btn){btn.disabled=false;btn.textContent=id?'Lưu thay đổi':'Tạo công thức';}}
    };
    window.deleteIngredient=async function(id){
      if(!usesVibe())return legacyDeleteIngredient?.(id);
      const row=(db.ingredients||[]).find(item=>String(item.id)===String(id));if(!row)return false;
      if(Math.abs(Number(window.stock?.(id)||0))>0.000001)return alert(`Không thể xóa "${row.name}" vì tồn kho chưa bằng 0.`);
      if(!window.confirm(`Xóa nguyên liệu/ dụng cụ "${row.name}"?`))return false;
      try{await request(`/api/v1/business/ingredient/${encodeURIComponent(id)}`,{method:'DELETE'});db.ingredients=(db.ingredients||[]).filter(item=>String(item.id)!==String(id));settle();renderIngredients?.();renderRecipes?.();toastMsg('Đã xóa nguyên liệu/ dụng cụ trên Vibe Host');setTimeout(()=>refreshFromVibe().catch(()=>{}),0);return true;}catch(error){alert('Không thể xóa: '+(error?.message||error));return false;}
    };
    window.deleteRecipe=async function(id){
      if(!usesVibe())return legacyDeleteRecipe?.(id);
      const row=(db.products||[]).find(item=>String(item.id)===String(id));if(!row)return false;
      if(!window.confirm(`Xóa "${row.name}" khỏi Thực đơn?`))return false;
      try{await request(`/api/v1/business/product/${encodeURIComponent(id)}`,{method:'DELETE'});db.products=(db.products||[]).filter(item=>String(item.id)!==String(id));settle();renderRecipes?.();renderSales?.();toastMsg('Đã xóa món trên Vibe Host');setTimeout(()=>refreshFromVibe().catch(()=>{}),0);return true;}catch(error){alert('Không thể xóa: '+(error?.message||error));return false;}
    };
    window.saveImportReceipt=async function(){
      if(!usesVibe())return legacyImport?.();
      const receiptNo=String($('receiptNo')?.value||'').trim();
      const receiptDate=String($('receiptDate')?.value||'').trim();
      const note=String($('receiptNote')?.value||'').trim();
      const items=window.getImportReceiptLines?.()||[];
      const form=$('inlineImportReceiptForm'),editKey=form?.dataset?.editKey||'';
      const btn=$('saveReceiptBtn'),status=$('receiptResult');
      if(!receiptNo||!items.length)return alert('Nhập số phiếu và ít nhất 1 mặt hàng.');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(receiptDate))return alert('Chọn ngày nhập kho hợp lệ.');
      try{
        if(btn){btn.disabled=true;btn.textContent='Đang lưu…';}
        const saved=await post('/api/v1/business/import',{
          header:{id:receiptId(editKey)||null,warehouse_id:currentWarehouseId,receipt_no:receiptNo,receipt_date:receiptDate,note},items
        });
        // A confirmed receipt must become an edit target before any refresh attempt.
        if(form)form.dataset.editKey=`ref:${saved.id}`;
        const confirmedDate=String(saved.header?.receipt_date||'').slice(0,10);
        if(confirmedDate&&confirmedDate!==receiptDate){
          if(status)status.textContent=`Phiếu đã lưu nhưng ngày máy chủ xác nhận là ${confirmedDate}, khác ngày đã chọn ${receiptDate}.`;
          alert('Ngày nhập kho trên máy chủ khác ngày đã chọn. Phiếu được giữ để kiểm tra và sửa lại.');
          return saved.id;
        }
        try{
          await refreshFromVibe();
          window.toggleImportReceiptForm?.(false);
          window.renderImports?.();
          window.toastMsg?.(`Đã lưu phiếu nhập ${receiptNo} ngày ${receiptDate} trên Vibe Host`);
        }catch(error){
          if(status)status.textContent='Đã lưu trên Vibe Host nhưng danh sách chưa tải lại. Vui lòng tải lại trang.';
          window.toastMsg?.('Phiếu đã lưu trên Vibe Host; vui lòng tải lại trang.');
        }
        return saved.id;
      }catch(error){
        if(status)status.textContent=`Lỗi: ${error?.message||error}`;
        alert('Lỗi phiếu nhập: '+(error?.message||error));
        return false;
      }finally{
        if(btn){btn.disabled=false;btn.textContent=form?.dataset?.editKey?'Lưu thay đổi phiếu':'Xác nhận nhập kho';}
      }
    };
    window.saveExportReceipt=async function(){
      if(!usesVibe())return legacyExport?.();const receiptNo=String($('exportReceiptNo')?.value||'').trim(),receiptDate=String($('exportReceiptDate')?.value||'').trim(),reason=String($('exportReceiptReason')?.value||'').trim(),financeTreatment=$('exportFinanceTreatment')?.value==='expense'?'expense':'inventory',items=window.getExportReceiptLines?.()||[],editKey=$('inlineExportReceiptForm')?.dataset?.editReferenceId||'',btn=$('saveExportReceiptBtn'),status=$('exportReceiptResult');if(!receiptNo||!items.length)return alert('Nhập số phiếu và ít nhất 1 mặt hàng.');
      try{if(btn){btn.disabled=true;btn.textContent='Đang lưu…';}const saved=await post('/api/v1/business/export',{header:{id:receiptId(editKey)||null,warehouse_id:currentWarehouseId,receipt_no:receiptNo,receipt_date:receiptDate,reason,finance_treatment:financeTreatment},items});if($('inlineExportReceiptForm'))$('inlineExportReceiptForm').dataset.editReferenceId=saved.id;try{await refreshFromVibe();window.toggleExportReceiptForm?.(false);window.renderImports?.();window.toastMsg?.(`Đã lưu phiếu xuất ${receiptNo} trên Vibe Host`);}catch(error){if(status)status.textContent='Đã lưu trên Vibe Host nhưng danh sách chưa tải lại. Vui lòng tải lại trang.';window.toastMsg?.('Phiếu đã lưu trên Vibe Host; vui lòng tải lại trang.');}return saved.id;}catch(error){if(status)status.textContent=`Lỗi: ${error?.message||error}`;alert('Lỗi phiếu xuất: '+(error?.message||error));return false;}finally{if(btn){btn.disabled=false;btn.textContent=editKey?'Lưu thay đổi phiếu xuất':'Xác nhận xuất kho';}}
    };
    window.deleteImportReceipt=async function(encoded){return usesVibe()?confirmReceiptDeletion('import',encoded):legacyDeleteImport?.(encoded);};
    window.deleteExportReceipt=async function(encoded){return usesVibe()?confirmReceiptDeletion('export',encoded):legacyDeleteExport?.(encoded);};
    window.deleteStocktakeReceipt=async function(encoded){
      if(!usesVibe())return legacyDeleteStocktake?.(encoded);
      const rows=window.stocktakeRowsByKey?.(encoded)||[],id=receiptId(rows?.[0]?.reference_id||encoded);if(!id)return alert('Không xác định được phiếu kiểm kê trên Vibe Host.');
      if(!await window.appConfirm?.('Xóa phiếu kiểm kê và hoàn tác chênh lệch tồn kho?','Xóa phiếu kiểm kê'))return false;
      try{await request(`/api/v1/business/stocktake/${encodeURIComponent(id)}`,{method:'DELETE'});await refreshFromVibe();renderStocktake?.();renderIngredients?.();toastMsg('Đã xóa phiếu kiểm kê trên Vibe Host');return true;}catch(error){alert('Không thể xóa phiếu kiểm kê: '+(error?.message||error));return false;}
    };
    window.saveStocktakeReceipt=async function(){
      if(!usesVibe())return legacyStocktake?.();const receiptNo=String($('stocktakeReceiptNo')?.value||'').trim(),receiptDate=String($('stocktakeReceiptDate')?.value||'').trim(),note=String($('stocktakeReceiptNote')?.value||'').trim(),lines=window.getStocktakeReceiptLines?.()||[],editKey=String($('inlineStocktakeForm')?.dataset?.editKey||''),btn=$('saveStocktakeReceiptBtn'),status=$('stocktakeReceiptResult');if(!receiptNo||!lines.length)return alert('Nhập số phiếu kiểm kê.');
      try{if(btn){btn.disabled=true;btn.textContent='Đang lưu…';}const saved=await post('/api/v1/business/stocktake',{header:{id:typeof lyFreshRef==='function'?lyFreshRef(editKey):null,warehouse_id:currentWarehouseId,receipt_no:receiptNo,receipt_date:receiptDate,note},items:lines.map((line,index)=>({ingredient_id:line.ingredient_id,actual_qty:Number(line.actual||0),line_order:Number(line.line_order||index+1)}))});if($('inlineStocktakeForm'))$('inlineStocktakeForm').dataset.editKey=`ref:${saved.id}`;try{await refreshFromVibe();window.toggleStocktakeForm?.(false);window.renderStocktake?.();window.toastMsg?.(`Đã lưu phiếu kiểm kê ${receiptNo} trên Vibe Host`);}catch(error){if(status)status.textContent='Đã lưu phiếu kiểm kê trên Vibe Host nhưng danh sách chưa tải lại. Vui lòng tải lại trang.';window.toastMsg?.('Phiếu kiểm kê đã lưu; danh sách đang chờ đồng bộ.');}return saved.id;}catch(error){if(status)status.textContent=`Lỗi: ${error?.message||error}`;alert('Lỗi kiểm kê: '+(error?.message||error));return false;}finally{if(btn){btn.disabled=false;btn.textContent=editKey?'Lưu thay đổi phiếu':'Lưu phiếu kiểm kê';}}
    };
    window.saveSaleReceipt=async function(){
      if(!usesVibe())return legacySale?.();const form=$('inlineSaleReceiptForm'),editId=form?.dataset?.editSaleId||'',receiptNo=String($('saleReceiptNo')?.value||'').trim(),saleDate=String($('saleReceiptDate')?.value||'').trim(),source=typeof window.resolvedSaleSource==='function'?window.resolvedSaleSource():String($('saleReceiptSource')?.value||'Tại quán'),note=String($('saleReceiptNote')?.value||'').trim(),lines=window.getSaleReceiptLines?.()||[],btn=$('saleReceiptSubmitBtn'),status=$('saleReceiptResult');if(!receiptNo||!lines.length)return alert('Nhập số phiếu và ít nhất 1 món.');
      try{if(btn){btn.disabled=true;btn.textContent='Đang lưu…';}const subtotal=lines.reduce((sum,line)=>sum+Number(line.line_subtotal??(line.quantity*line.unit_price)??0),0),itemDiscount=lines.reduce((sum,line)=>sum+Number(line.item_discount||0),0),discountInfo=window.getSaleDiscount?.(Math.max(0,subtotal-itemDiscount))||{discount:0,total:subtotal-itemDiscount},needs={};for(const line of lines){const expanded=window.lyFreshProductNeeds?.(line.product_id,Number(line.quantity||0))||{};for(const [ingredientId,quantity] of Object.entries(expanded))needs[ingredientId]=(needs[ingredientId]||0)+Number(quantity||0);}const soldAt=/^\d{4}-\d{2}-\d{2}$/.test(saleDate)?new Date(`${saleDate}T12:00:00`).toISOString():new Date().toISOString(),saved=await post('/api/v1/business/sale',{header:{id:editId||null,warehouse_id:currentWarehouseId,receipt_no:receiptNo,sold_at:soldAt,source,note,subtotal,discount:Number(discountInfo.discount||0)+itemDiscount,total_amount:Math.max(0,Number(discountInfo.total||0))},sale_items:lines.map(line=>({product_id:line.product_id,quantity:Number(line.quantity||0),unit_price:Number(line.unit_price||0),line_total:Math.max(0,Number(line.line_total??(line.quantity*line.unit_price)??0)-Number(line.item_discount||0))})),stock_lines:Object.entries(needs).map(([ingredient_id,quantity])=>({ingredient_id,quantity:-Number(quantity||0)}))});if(form)form.dataset.editSaleId=saved.id;try{await refreshFromVibe();window.toggleSaleReceiptForm?.(false);window.renderSales?.();window.toastMsg?.(`Đã lưu phiếu bán ${receiptNo} trên Vibe Host`);}catch(error){if(status)status.textContent='Đã lưu phiếu bán trên Vibe Host nhưng danh sách chưa tải lại. Vui lòng tải lại trang.';window.toastMsg?.('Phiếu bán đã lưu; danh sách đang chờ đồng bộ.');}return saved.id;}catch(error){if(status)status.textContent=`Lỗi: ${error?.message||error}`;alert('Lỗi bán hàng: '+(error?.message||error));return false;}finally{if(btn){btn.disabled=false;btn.textContent=editId?'Lưu thay đổi phiếu':'Xác nhận bán & trừ kho';}}
    };
    window.deleteSaleReceipt=async function(id){
      if(!usesVibe())return legacyDeleteSale?.(id);if(!id)return false;
      if(!await window.appConfirm?.('Xóa phiếu bán và hoàn tác tồn kho liên quan?','Xóa phiếu bán'))return false;
      try{await request(`/api/v1/business/sale/${encodeURIComponent(id)}`,{method:'DELETE'});await refreshFromVibe();renderSales?.();renderIngredients?.();renderDashboard?.();toastMsg('Đã xóa phiếu bán trên Vibe Host');return true;}catch(error){alert('Không thể xóa phiếu bán: '+(error?.message||error));return false;}
    };
    window.saveWarehouse=async function(id){if(!usesVibe())return legacyWarehouse?.(id);const name=String($('wName')?.value||'').trim();if(!name)return alert('Nhập tên kho');try{const saved=await post('/api/v1/business/warehouse',{warehouse:{id:id||null,name,address:String($('wAddress')?.value||''),active:true}});currentWarehouseId=saved.id;await refreshFromVibe();closeModal?.();toastMsg('Đã lưu kho trên Vibe Host');return saved.id;}catch(error){alert('Lỗi kho: '+(error?.message||error));return false;}};
    window.saveSupplier=async function(id){if(!usesVibe())return legacySupplier?.(id);const name=String($('spName')?.value||'').trim();if(!name)return alert('Nhập tên nhà cung cấp');try{const saved=await post('/api/v1/business/supplier',{supplier:{id:id||null,name,phone:String($('spPhone')?.value||''),address:String($('spAddress')?.value||''),note:String($('spNote')?.value||'')}});await refreshFromVibe();closeModal?.();toastMsg('Đã lưu nhà cung cấp trên Vibe Host');return saved.id;}catch(error){alert('Lỗi nhà cung cấp: '+(error?.message||error));return false;}};
    window.addCashflowEntry=async function(){if(!usesVibe())return legacyCashflow?.();const type=$('cashflowType')?.value||'expense',date=$('cashflowDate')?.value||new Date().toISOString().slice(0,10),category=String($('cashflowCategory')?.value||'').trim(),amount=Math.max(0,Number($('cashflowAmount')?.value||0)),note=String($('cashflowNote')?.value||'').trim(),editId=typeof cashflowEditId!=='undefined'?cashflowEditId:'',existing=editId?loadCashflow?.().find(row=>row.id===editId):null;if(!category||amount<=0)return alert('Nhập nội dung và số tiền.');try{const saved=await post('/api/v1/business/cashflow',{cashflow:{id:existing?.id||null,warehouse_id:currentWarehouseId,entry_type:type,entry_date:date,category,amount,note,finance_scope:type==='expense'&&typeof INVENTORY_PAYMENT_CASHFLOW_CATEGORY!=='undefined'&&category===INVENTORY_PAYMENT_CASHFLOW_CATEGORY?'inventory_asset':null}});if(saved.row)projectCashflowRow(saved.row);cashflowReadAt=0;let confirmed=false;try{const refreshed=await refreshCashflow(true);confirmed=refreshed&&(window.__lyFreshCashflow||[]).some(row=>String(row.id)===String(saved.id));}catch(error){console.warn('[cashflow-history-refresh]',error);}if(!confirmed&&saved.row)projectCashflowRow(saved.row);if(typeof cashflowEditId!=='undefined')cashflowEditId='';if(typeof cashflowFormOpen!=='undefined')cashflowFormOpen=false;renderCashflow?.();renderFinanceData?.();toastMsg(confirmed?'Đã lưu và hiển thị phiếu Thu/Chi trên Vibe Host':'Phiếu đã lưu trên Vibe Host; lịch sử đang chờ đồng bộ.');return saved.id;}catch(error){alert('Lỗi lưu Thu/Chi: '+(error?.message||error));return false;}};
    window.deleteCashflowEntry=async function(id){
      if(!usesVibe())return legacyDeleteCashflow?.(id);
      const entry=(window.__lyFreshCashflow||[]).find(row=>String(row.id)===String(id)&&String(row.warehouse_id)===String(currentWarehouseId));
      if(!entry)return alert('Không tìm thấy phiếu Thu/Chi trong kho đang chọn. Hãy tải lại dữ liệu.');
      if(cashflowDeleting.has(String(id)))return false;
      if(!await window.appConfirm?.('Xóa khoản thu/chi này?','Xóa phiếu Thu/Chi'))return false;
      cashflowDeleting.add(String(id));
      const warehouseId=currentWarehouseId;
      try{
        const result=await request(`/api/v1/business/cashflow/${encodeURIComponent(id)}?warehouse_id=${encodeURIComponent(warehouseId)}`,{method:'DELETE'});
        if(result?.ok!==true||String(result.id)!==String(id))throw new Error('Vibe Host chưa xác nhận xóa phiếu Thu/Chi.');
        window.__lyFreshCashflow=(window.__lyFreshCashflow||[]).filter(row=>String(row.id)!==String(id));
        cashflowReadAt=0;
        window.invalidateDerivedCaches?.();
        if(typeof cashflowEditId!=='undefined'&&String(cashflowEditId)===String(id)){cashflowEditId='';cashflowFormOpen=false;}
        window.renderCashflow?.();window.renderFinanceData?.();
        window.toastMsg?.('Đã xóa phiếu Thu/Chi trên Vibe Host');
        setTimeout(()=>refreshFromVibe().catch(error=>console.warn('[cashflow-delete-refresh]',error)),0);
        return true;
      }catch(error){alert('Lỗi xóa Thu/Chi: '+(error?.message||error));return false;}
      finally{cashflowDeleting.delete(String(id));}
    };
    window.saveEmployee=async function(id=''){
      if(!usesVibe())return legacyEmployee(id);
      const name=String($('empName')?.value||'').trim();
      if(!name)return alert('Nhập họ tên nhân viên');
      const existing=(window.loadEmployees?.()||[]).find(row=>String(row.id)===String(id));
      const employee={
        ...existing,id:id||uid(),code:String($('empCode')?.value||'').trim()||nextEmployeeCode(),name,
        role:String($('empRole')?.value||'').trim(),phone:String($('empPhone')?.value||'').trim(),
        shift:String($('empShift')?.value||'').trim(),attendance_mode:$('empAttendanceMode')?.value||'day',
        active:$('empActive')?.value==='1',hire_date:$('empHireDate')?.value||todayLocalISO(),
        base_salary:Number($('empBaseSalary')?.value||0),standard_days:Math.max(1,Number($('empStandardDays')?.value||26)),
        hourly_rate:Number($('empHourlyRate')?.value||0),bank_account:String($('empBank')?.value||'').trim(),
        id_number:String($('empIdNumber')?.value||'').trim(),address:String($('empAddress')?.value||'').trim(),
        emergency_contact:String($('empEmergency')?.value||'').trim(),note:String($('empNote')?.value||'').trim(),
        warehouse_id:currentWarehouseId,updated_at:new Date().toISOString()
      };
      const button=document.querySelector('#modal .receipt-modal-actions .primary');
      try{
        if(button){button.disabled=true;button.textContent='Đang lưu…';}
        const saved=await post('/api/v1/business/employees',{employee:{...employee,legacy_id:employee.id}});
        employee.vibe_id=saved.id;
        const list=(window.loadEmployees?.()||[]).filter(row=>String(row.id)!==String(id)&&employeeKey(row)!==employeeKey(employee));
        saveEmployees?.([...list,{...employee,created_at:existing?.created_at||new Date().toISOString()}]);
        closeModal?.();renderEmployees?.();
        toastMsg('Đã lưu nhân viên trên Vibe Host');
        return saved.id;
      }catch(error){alert('Lỗi lưu nhân viên: '+(error?.message||error));return false;}
      finally{if(button){button.disabled=false;button.textContent='Lưu nhân viên';}}
    };
    window.deleteEmployee=async function(id){
      if(!usesVibe())return legacyDeleteEmployee(id);
      const employee=(window.loadEmployees?.()||[]).find(row=>String(row.id)===String(id));
      if(!employee)return alert('Không tìm thấy nhân viên cần xóa.');
      if(!window.confirm(`Bạn có chắc muốn xóa nhân viên "${employee.name}"?\n\nNhân viên sẽ bị xóa khỏi danh sách, chấm công và bảng lương.`))return false;
      try{
        let vibeId=employee.vibe_id||'';
        if(!vibeId){
          const cloud=await request(`/api/v1/business/employees?warehouse_id=${encodeURIComponent(currentWarehouseId)}`);
          vibeId=(cloud.rows||[]).find(row=>employeeKey(row)===employeeKey(employee))?.id||'';
        }
        if(vibeId)await request(`/api/v1/business/employee/${encodeURIComponent(vibeId)}`,{method:'DELETE'});
        legacyDeleteEmployee(id,true);
        return true;
      }catch(error){alert('Lỗi xóa nhân viên: '+(error?.message||error));return false;}
    };
    window.__lyVibeBusinessWrites={version:VERSION,installing:false,refreshCashflow,importQuantityBreakdown};return true;
  }
  const boot=()=>{if(!install())setTimeout(boot,50);else syncEmployees().catch(error=>console.error('[employee-sync]',error));};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
