(()=>{
  'use strict';
  if(window.__lyStockUnitSync)return;
  const VERSION='2026.08.25.1';

  const api=()=>window.__lyUnitConversions||null;
  const rows=()=>{try{return Array.isArray(db?.ingredients)?db.ingredients:[]}catch(e){return []}};
  const ingredient=id=>rows().find(item=>String(item?.id||'')===String(id||''))||null;
  const canonical=value=>api()?.canonical?.(value)||String(value||'').trim();
  const ruleFor=ing=>{
    if(!ing)return null;
    const rule=api()?.ruleFor?.(ing.id)||null;
    const base=canonical(rule?.baseUnit||ing.unit||'');
    const purchase=canonical(rule?.purchaseUnit||ing.purchase_unit||base);
    const ratio=Number(rule?.ratio||ing.conversion_ratio||1);
    return base&&purchase&&Number.isFinite(ratio)&&ratio>0?{base,purchase,ratio}:null;
  };
  const factorToBase=(ing,unit)=>{
    const rule=ruleFor(ing);if(!rule)return 1;
    const value=api()?.convert?.(1,unit||rule.purchase,rule.base,ing.id);
    return Number.isFinite(value)&&value>0?value:1;
  };
  const fmt=value=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:6}).format(Number(value||0));
  const moneyText=value=>{try{return typeof money==='function'?money(value):new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(value||0))}catch(e){return `${fmt(value)} ₫`}};

  function preferredUnit(ing){
    const rule=ruleFor(ing);
    return rule?.purchase||canonical(ing?.unit||'');
  }

  function fillUnitSelect(select,ing,current=''){
    if(!select||!ing)return;
    const preferred=canonical(current||preferredUnit(ing));
    if(!api()?.applyIngredientOptions?.(select,ing,preferred)){
      select.options.length=0;
      select.add(new Option(preferred||ing.unit||'—',preferred||ing.unit||''));
    }
    if([...select.options].some(option=>option.value===preferred))select.value=preferred;
  }

  function installImportUnitDefault(){
    const original=window.updateIngredientUnitDisplay;
    if(typeof original!=='function'||original.__lyStockUnitWrapped)return false;
    const wrapped=function(selectEl,className){
      const result=original.apply(this,arguments);
      try{
        const row=selectEl?.closest?.('.import-receipt-line');
        if(row&&className==='irUnit'){
          const ing=ingredient(selectEl.value),unitEl=row.querySelector('.irUnit');
          if(ing&&unitEl?.tagName==='SELECT')fillUnitSelect(unitEl,ing,preferredUnit(ing));
        }
      }catch(e){console.warn('[Lát Yên] import unit default',e)}
      return result;
    };
    wrapped.__lyStockUnitWrapped=true;
    wrapped.__lyOriginal=original;
    window.updateIngredientUnitDisplay=wrapped;
    return true;
  }

  function installImportLineWrapper(){
    const original=window.addImportReceiptLine;
    if(typeof original!=='function'||original.__lyStockUnitWrapped)return false;
    const wrapped=function(ingredientId='',supplierName='',qty='',unitCost=''){
      const ing=ingredient(ingredientId),unit=preferredUnit(ing),factor=ing?factorToBase(ing,unit):1;
      const displayQty=qty!==''&&Number.isFinite(Number(qty))?Number(qty)/factor:qty;
      const displayCost=unitCost!==''&&Number.isFinite(Number(unitCost))?Number(unitCost)*factor:unitCost;
      const result=original.call(this,ingredientId,supplierName,displayQty,displayCost);
      try{
        const holder=document.getElementById('importReceiptLines'),row=holder?.lastElementChild;
        const select=row?.querySelector?.('.irUnit');
        if(row&&select&&ing){fillUnitSelect(select,ing,unit);row.dataset.lyStockUnitSync='1';window.updateImportReceiptTotals?.();}
      }catch(e){console.warn('[Lát Yên] import line sync',e)}
      return result;
    };
    wrapped.__lyStockUnitWrapped=true;wrapped.__lyOriginal=original;window.addImportReceiptLine=wrapped;return true;
  }

  function baseCurrentForRow(row,ing){
    const stored=Number(row?.dataset?.lyBaseCurrent);
    if(Number.isFinite(stored))return stored;
    let current=NaN;
    try{if(typeof window.exportEditableBaseStock==='function')current=Number(window.exportEditableBaseStock(ing.id));}catch(e){}
    if(!Number.isFinite(current))current=Number(String(row?.querySelector?.('.erCurrent')?.textContent||'').replace(/[^0-9+\-.]/g,''));
    if(!Number.isFinite(current))current=0;
    if(row)row.dataset.lyBaseCurrent=String(current);
    return current;
  }

  function updateExportRow(row,resetPrice=false){
    if(!row)return;
    const ingredientId=row.querySelector('.erIngredient')?.value||'';
    const ing=ingredient(ingredientId);if(!ing)return;
    const rule=ruleFor(ing),base=rule?.base||canonical(ing.unit||'');
    let unitEl=row.querySelector('.erUnit');
    if(unitEl?.tagName!=='SELECT'){
      const select=document.createElement('select');
      select.className='erUnit ingredient-unit-select';
      select.onchange=()=>updateExportRow(row,true);
      unitEl?.replaceWith(select);unitEl=select;
    }
    if(!unitEl.options?.length)fillUnitSelect(unitEl,ing,preferredUnit(ing));
    const selected=canonical(unitEl.value||preferredUnit(ing));
    const factor=factorToBase(ing,selected);
    const qty=Math.max(0,Number(row.querySelector('.erQty')?.value||0));
    const baseQty=qty*factor;
    const currentBase=baseCurrentForRow(row,ing);
    const priceInput=row.querySelector('.erUnitCost');
    if(resetPrice&&priceInput)priceInput.value=String(Math.max(0,Number(ing.cost||0))*factor);
    const displayUnitCost=Math.max(0,Number(priceInput?.value||0));
    const lineTotal=qty*displayUnitCost;
    const currentEl=row.querySelector('.erCurrent'),afterEl=row.querySelector('.erAfter'),totalEl=row.querySelector('.erLineTotal');
    if(currentEl)currentEl.textContent=`${fmt(currentBase)} ${base}`;
    if(afterEl){afterEl.textContent=`${fmt(currentBase-baseQty)} ${base}`;afterEl.classList.toggle('neg',currentBase-baseQty<0);}
    if(totalEl)totalEl.textContent=moneyText(lineTotal);
    row.dataset.lySelectedUnit=selected;
    row.dataset.lyBaseQuantity=String(baseQty);
    row.dataset.lyBaseUnit=base;
  }

  function enhanceExportRow(row,ing,unit,preserveCost=true){
    if(!row||!ing)return;
    const currentText=String(row.querySelector('.erCurrent')?.textContent||'').replace(/[^0-9+\-.]/g,'');
    const current=Number(currentText);if(Number.isFinite(current))row.dataset.lyBaseCurrent=String(current);
    let unitEl=row.querySelector('.erUnit');
    if(unitEl?.tagName!=='SELECT'){
      const select=document.createElement('select');select.className='erUnit ingredient-unit-select';unitEl?.replaceWith(select);unitEl=select;
    }
    fillUnitSelect(unitEl,ing,unit);
    unitEl.onchange=()=>updateExportRow(row,true);
    row.querySelector('.erIngredient')?.setAttribute('onchange',"updateExportReceiptLine(this.closest('.export-receipt-line'),true)");
    row.dataset.lyStockUnitSync='1';
    updateExportRow(row,!preserveCost);
  }

  function installExportWrappers(){
    const addOriginal=window.addExportReceiptLine;
    if(typeof addOriginal==='function'&&!addOriginal.__lyStockUnitWrapped){
      const wrapped=function(ingredientId='',qty='',unitCost=''){
        const ing=ingredient(ingredientId),unit=preferredUnit(ing),factor=ing?factorToBase(ing,unit):1;
        const displayQty=qty!==''&&Number.isFinite(Number(qty))?Number(qty)/factor:qty;
        const displayCost=unitCost!==''&&Number.isFinite(Number(unitCost))?Number(unitCost)*factor:unitCost;
        const result=addOriginal.call(this,ingredientId,displayQty,displayCost);
        try{const row=document.getElementById('exportReceiptLines')?.lastElementChild;if(row&&ing)enhanceExportRow(row,ing,unit,unitCost!=='');}catch(e){console.warn('[Lát Yên] export line sync',e)}
        return result;
      };
      wrapped.__lyStockUnitWrapped=true;wrapped.__lyOriginal=addOriginal;window.addExportReceiptLine=wrapped;
    }

    const updateOriginal=window.updateExportReceiptLine;
    if(typeof updateOriginal==='function'&&!updateOriginal.__lyStockUnitWrapped){
      const wrapped=function(row,resetPrice=false){
        try{
          const id=row?.querySelector?.('.erIngredient')?.value||'',ing=ingredient(id);
          if(!ing)return updateOriginal.apply(this,arguments);
          row.dataset.lyBaseCurrent='';
          const unitEl=row.querySelector('.erUnit');
          if(unitEl?.tagName!=='SELECT')enhanceExportRow(row,ing,preferredUnit(ing),false);
          else if(resetPrice){fillUnitSelect(unitEl,ing,preferredUnit(ing));}
          return updateExportRow(row,resetPrice);
        }catch(e){console.warn('[Lát Yên] export update sync',e);return updateOriginal.apply(this,arguments)}
      };
      wrapped.__lyStockUnitWrapped=true;wrapped.__lyOriginal=updateOriginal;window.updateExportReceiptLine=wrapped;
    }

    const getOriginal=window.getExportReceiptLines;
    if(typeof getOriginal==='function'&&!getOriginal.__lyStockUnitWrapped){
      const wrapped=function(){
        return [...document.querySelectorAll('.export-receipt-line')].map(row=>{
          const id=row.querySelector('.erIngredient')?.value||'',ing=ingredient(id);if(!ing)return null;
          const selected=canonical(row.querySelector('.erUnit')?.value||preferredUnit(ing));
          const displayQty=Math.max(0,Number(row.querySelector('.erQty')?.value||0));
          const displayCost=Math.max(0,Number(row.querySelector('.erUnitCost')?.value||0));
          const factor=factorToBase(ing,selected),baseQty=displayQty*factor,total=displayQty*displayCost;
          return {ingredient_id:id,quantity:baseQty,unit_cost:baseQty>0?total/baseQty:0,line_total:total,input_unit:selected,input_quantity:displayQty};
        }).filter(x=>x?.ingredient_id&&x.quantity>0);
      };
      wrapped.__lyStockUnitWrapped=true;wrapped.__lyOriginal=getOriginal;window.getExportReceiptLines=wrapped;
    }
    return true;
  }

  let timer=0;
  function install(){installImportUnitDefault();installImportLineWrapper();installExportWrappers();}
  function schedule(){clearTimeout(timer);timer=setTimeout(install,50);}
  function boot(){
    install();
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
    setInterval(install,2000);
  }

  window.__lyStockUnitSync={version:VERSION,updateExportRow,preferredUnit,factorToBase};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
