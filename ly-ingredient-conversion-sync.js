(()=>{
  'use strict';
  if(window.__lyIngredientConversionSync)return;
  const VERSION='2026.08.25.2';
  const fold=value=>String(value??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  const fmt=value=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:6}).format(Number(value||0));
  const client=()=>{try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}return window.sb||null;};
  const ingredients=()=>{
    const rows=[];
    try{if(typeof db!=='undefined'&&Array.isArray(db?.ingredients))rows.push(...db.ingredients);}catch(e){}
    try{const v2=window.__lyFreshCoreV2?.store?.getState?.()?.ingredients;if(Array.isArray(v2))rows.push(...v2);}catch(e){}
    const unique=new Map();rows.forEach(row=>{if(row?.id)unique.set(String(row.id),row);});return [...unique.values()];
  };
  const ruleFor=ingredient=>{
    if(!ingredient)return null;
    const api=window.__lyUnitConversions;
    const rule=api?.ruleFor?.(ingredient.id);
    const base=String(rule?.baseUnit||ingredient.unit||'').trim();
    const purchase=String(rule?.purchaseUnit||ingredient.purchase_unit||base).trim();
    const ratio=Number(rule?.ratio||ingredient.conversion_ratio||1);
    return base&&purchase&&Number.isFinite(ratio)&&ratio>0?{base,purchase,ratio}:null;
  };
  const packagingText=ingredient=>{
    const rule=ruleFor(ingredient);if(!rule)return '—';
    return `${rule.purchase} · 1 ${rule.purchase} = ${fmt(rule.ratio)} ${rule.base}`;
  };
  function refreshTables(){
    const rows=ingredients();
    document.querySelectorAll('table.ingredient-stock-table:not(.prepared-virtual-table)').forEach(table=>{
      const header=table.rows?.[0];if(!header)return;
      const labels=[...header.cells].map(cell=>String(cell.textContent||'').trim());
      const unitIndex=labels.indexOf('Đơn vị');if(unitIndex<0)return;
      let purchaseHeader=header.querySelector('[data-ly-purchase-column]');
      if(!purchaseHeader){purchaseHeader=document.createElement('th');purchaseHeader.textContent='Đơn vị mua/đóng gói';purchaseHeader.dataset.lyPurchaseColumn='1';header.cells[unitIndex].after(purchaseHeader);}
      [...table.rows].slice(1).forEach(row=>{
        const name=String(row.cells?.[1]?.textContent||'').trim();
        const ingredient=rows.find(item=>fold(item?.name)===fold(name));
        let cell=row.querySelector('[data-ly-purchase-cell]');
        if(!cell){cell=document.createElement('td');cell.dataset.lyPurchaseCell='1';row.cells?.[unitIndex]?.after(cell);}
        cell.style.whiteSpace='nowrap';
        cell.textContent=ingredient?packagingText(ingredient):'—';
      });
    });
  }
  async function persistCaptured(captured,idHint=''){
    if(!captured?.name||!captured?.purchaseUnit||!(captured?.ratio>0))return;
    const c=client();if(!c?.from)return;
    let id=String(idHint||'');
    if(!id){
      const q=await c.from('ly_ingredients').select('id').eq('name',captured.name).limit(1).maybeSingle();
      if(q?.error||!q?.data?.id)return;
      id=String(q.data.id);
    }
    const patch={purchase_unit:captured.purchaseUnit,conversion_ratio:captured.ratio};
    const r=await c.from('ly_ingredients').update(patch).eq('id',id);
    if(r?.error){console.warn('[Lát Yên] Không lưu được quy đổi lên Cloud',r.error);return;}
    try{if(typeof db!=='undefined'&&Array.isArray(db?.ingredients)){const item=db.ingredients.find(x=>String(x?.id||'')===id);if(item)Object.assign(item,patch);}}catch(e){}
    window.__lyUnitConversions?.saveIngredientRule?.(id,{baseUnit:captured.baseUnit,purchaseUnit:captured.purchaseUnit,ratio:captured.ratio});
    window.dispatchEvent(new CustomEvent('latyen:v2-ingredient-saved',{detail:{id,conversion:true}}));
    setTimeout(refreshTables,80);
  }
  function captureForm(){
    const name=document.getElementById('igName')?.value?.trim();
    const unitEl=document.getElementById('igUnit'),other=document.getElementById('igUnitOther');
    const baseUnit=unitEl?.value==='khác'?String(other?.value||'').trim():String(unitEl?.value||'').trim();
    const purchaseUnit=String(document.getElementById('igPurchaseUnit')?.value||baseUnit).trim();
    const ratio=Number(document.getElementById('igConversionRatio')?.value||1);
    return {name,baseUnit,purchaseUnit,ratio};
  }

  function ingredientRow(id,name=''){
    const needle=String(id||'').trim(),nameKey=fold(name);
    for(const table of document.querySelectorAll('table.ingredient-stock-table:not(.prepared-virtual-table)')){
      for(const row of [...table.rows].slice(1)){
        if(needle){
          const hit=[...row.querySelectorAll('[onclick],button')].some(el=>String(el.getAttribute('onclick')||'').includes(needle));
          if(hit)return row;
        }
        if(nameKey&&fold(row.cells?.[1]?.textContent||'')===nameKey)return row;
      }
    }
    return null;
  }
  function captureViewport(id,name){
    const row=ingredientRow(id,name),box=row?.closest?.('.scroll')||null;
    return {
      id:String(id||''),name:String(name||''),
      rowTop:row?.getBoundingClientRect?.().top??null,
      pageY:window.scrollY,pageX:window.scrollX,
      box,boxTop:box?.scrollTop??null,boxLeft:box?.scrollLeft??null
    };
  }
  function ensureUXStyle(){
    if(document.getElementById('lyIngredientSavedUX'))return;
    const style=document.createElement('style');style.id='lyIngredientSavedUX';
    style.textContent=`.ingredient-stock-table tr.ly-ingredient-saved>td{animation:lyIngredientSaved 1.6s ease-out}@keyframes lyIngredientSaved{0%,25%{background:#ecfdf3;box-shadow:inset 3px 0 0 #12b76a}100%{background:transparent;box-shadow:none}}@media(prefers-reduced-motion:reduce){.ingredient-stock-table tr.ly-ingredient-saved>td{animation:none;background:#ecfdf3}}`;
    document.head.appendChild(style);
  }
  function restoreViewport(snapshot){
    if(!snapshot)return;
    const row=ingredientRow(snapshot.id,snapshot.name);
    if(snapshot.box?.isConnected){
      if(Number.isFinite(snapshot.boxTop))snapshot.box.scrollTop=snapshot.boxTop;
      if(Number.isFinite(snapshot.boxLeft))snapshot.box.scrollLeft=snapshot.boxLeft;
    }
    if(row&&Number.isFinite(snapshot.rowTop)){
      const delta=row.getBoundingClientRect().top-snapshot.rowTop;
      if(Math.abs(delta)>1)window.scrollBy({top:delta,left:0,behavior:'auto'});
      row.classList.remove('ly-ingredient-saved');void row.offsetWidth;row.classList.add('ly-ingredient-saved');
      setTimeout(()=>row.classList.remove('ly-ingredient-saved'),1700);
    }else{
      window.scrollTo({top:snapshot.pageY,left:snapshot.pageX,behavior:'auto'});
    }
  }
  function scheduleViewportRestore(snapshot){
    if(!snapshot)return;
    const run=()=>restoreViewport(snapshot);
    requestAnimationFrame(()=>requestAnimationFrame(run));
    setTimeout(run,80);setTimeout(run,220);setTimeout(run,500);
  }

  function wrapSave(){
    const original=window.saveIngredient;
    if(typeof original!=='function'||original.__lyConversionWrapped)return false;
    const wrapped=async function(id){
      const captured=captureForm();
      const editId=String(id||document.getElementById('ingredientInlinePanel')?.dataset?.editId||'').trim();
      const viewport=editId?captureViewport(editId,captured.name):null;
      const result=await original.apply(this,arguments);
      try{await persistCaptured(captured,id||'');}catch(e){console.warn('[Lát Yên] Lỗi đồng bộ quy đổi',e);}
      if(viewport)scheduleViewportRestore(viewport);
      return result;
    };
    wrapped.__lyConversionWrapped=true;wrapped.__lyOriginal=original;window.saveIngredient=wrapped;return true;
  }
  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{wrapSave();refreshTables();},60);};
  const boot=()=>{
    ensureUXStyle();wrapSave();refreshTables();
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('latyen:v2-ingredient-saved',schedule);
    window.addEventListener('latyen:cloud-refreshed',schedule);
    setInterval(()=>{wrapSave();refreshTables();},2500);
  };
  window.__lyIngredientConversionSync={version:VERSION,refreshTables,persistCaptured,restoreViewport};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
