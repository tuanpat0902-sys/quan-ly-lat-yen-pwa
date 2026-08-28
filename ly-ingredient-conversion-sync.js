(()=>{
  'use strict';
  if(window.__lyIngredientConversionSync)return;
  const VERSION='2026.08.29.3';
  const fold=v=>String(v??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  const fmt=v=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:6}).format(Number(v||0));
  const client=()=>{try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}return window.sb||null;};
  let createViewport=null;
  let createMode=window.__lyIngredientCreateMode||'purchased';

  const ingredients=()=>{const rows=[];try{if(typeof db!=='undefined'&&Array.isArray(db?.ingredients))rows.push(...db.ingredients);}catch(e){}try{const v2=window.__lyFreshCoreV2?.store?.getState?.()?.ingredients;if(Array.isArray(v2))rows.push(...v2);}catch(e){}const unique=new Map();rows.forEach(r=>{if(r?.id)unique.set(String(r.id),r);});return [...unique.values()];};
  const ruleFor=ingredient=>{if(!ingredient)return null;const api=window.__lyUnitConversions;const rule=api?.ruleFor?.(ingredient.id);const base=String(rule?.baseUnit||ingredient.unit||'').trim();const purchase=String(rule?.purchaseUnit||ingredient.purchase_unit||base).trim();const ratio=Number(rule?.ratio||ingredient.conversion_ratio||1);return base&&purchase&&Number.isFinite(ratio)&&ratio>0?{base,purchase,ratio}:null;};
  const packagingText=ingredient=>{const rule=ruleFor(ingredient);if(!rule)return '—';return `${rule.purchase} · 1 ${rule.purchase} = ${fmt(rule.ratio)} ${rule.base}`;};

  function colKey(label){
    const x=fold(label);
    if(x==='stt')return 'stt';
    if(x==='ten'||x.startsWith('ten '))return 'name';
    if(x.includes('don vi mua')||x.includes('dong goi'))return 'purchase';
    if(x==='don vi'||x.startsWith('don vi '))return 'unit';
    if(x.includes('nha cung cap'))return 'supplier';
    if(x==='ton'||x.startsWith('ton '))return 'stock';
    if(x.includes('toi thieu'))return 'minimum';
    if(x.includes('trang thai'))return 'status';
    if(x.includes('gia von'))return 'avgcost';
    if(x.includes('gia tri'))return 'value';
    if(x.includes('thao tac')||x.includes('hanh dong'))return 'actions';
    return '';
  }
  function tagColumns(table){
    const header=table?.rows?.[0];if(!header)return;
    [...header.cells].forEach(cell=>{const key=colKey(cell.textContent);if(key)cell.dataset.lyCol=key;else delete cell.dataset.lyCol;});
    const keys=[...header.cells].map(cell=>cell.dataset.lyCol||'');
    [...table.rows].slice(1).forEach(row=>[...row.cells].forEach((cell,i)=>{const key=keys[i];if(key)cell.dataset.lyCol=key;else delete cell.dataset.lyCol;}));
  }
  function refreshTables(){
    const rows=ingredients();
    document.querySelectorAll('table.ingredient-stock-table:not(.prepared-virtual-table)').forEach(table=>{
      const header=table.rows?.[0];if(!header)return;const labels=[...header.cells].map(c=>String(c.textContent||'').trim());const unitIndex=labels.indexOf('Đơn vị');if(unitIndex<0)return;
      let purchaseHeader=header.querySelector('[data-ly-purchase-column]');if(!purchaseHeader){purchaseHeader=document.createElement('th');purchaseHeader.textContent='Mua/đóng gói';purchaseHeader.title='Đơn vị mua/đóng gói';purchaseHeader.dataset.lyPurchaseColumn='1';header.cells[unitIndex].after(purchaseHeader);}
      else if(purchaseHeader.textContent!=='Mua/đóng gói'){purchaseHeader.textContent='Mua/đóng gói';purchaseHeader.title='Đơn vị mua/đóng gói';}
      [...table.rows].slice(1).forEach(row=>{const name=String(row.cells?.[1]?.textContent||'').trim();const ingredient=rows.find(item=>fold(item?.name)===fold(name));let cell=row.querySelector('[data-ly-purchase-cell]');if(!cell){cell=document.createElement('td');cell.dataset.lyPurchaseCell='1';row.cells?.[unitIndex]?.after(cell);}cell.style.whiteSpace='normal';cell.textContent=ingredient?packagingText(ingredient):'—';});
      tagColumns(table);
    });
  }

  function fieldBox(el){return el?.closest?.('.field,.form-group,.input-group,.control-group')||el?.parentElement||null;}
  function setBoxHidden(box,hidden){if(!box)return;if(hidden){if(box.dataset.lyPreparedHidden!=='1'){box.dataset.lyPreparedHidden='1';box.dataset.lyOldDisplay=box.style.display||'';}box.style.display='none';}else if(box.dataset.lyPreparedHidden==='1'){box.style.display=box.dataset.lyOldDisplay||'';delete box.dataset.lyPreparedHidden;delete box.dataset.lyOldDisplay;}}
  function applyModeUX(){
    const prepared=createMode==='prepared';
    const purchase=document.getElementById('igPurchaseUnit'),ratio=document.getElementById('igConversionRatio');
    setBoxHidden(fieldBox(purchase),prepared);setBoxHidden(fieldBox(ratio),prepared);
    const panel=document.getElementById('ingredientInlinePanel');
    if(panel){panel.dataset.lyIngredientMode=createMode;[...panel.querySelectorAll('label,.field-label,.form-label')].forEach(label=>{const text=fold(label.textContent);if(text.includes('so don vi ton nhan duoc')||text.includes('don vi mua')||text.includes('dong goi'))setBoxHidden(fieldBox(label),prepared);});}
    if(prepared){
      const unit=document.getElementById('igUnit');const other=document.getElementById('igUnitOther');const base=unit?.value==='khác'?String(other?.value||'').trim():String(unit?.value||'').trim();
      if(purchase&&base)purchase.value=base;if(ratio)ratio.value='1';
    }
  }
  function setCreateMode(mode){createMode=mode==='prepared'?'prepared':'purchased';window.__lyIngredientCreateMode=createMode;requestAnimationFrame(applyModeUX);setTimeout(applyModeUX,80);}

  async function persistCaptured(captured,idHint=''){
    if(captured?.mode==='prepared')return;
    if(!captured?.name||!captured?.purchaseUnit||!(captured?.ratio>0))return;const c=client();if(!c?.from)return;let id=String(idHint||'');
    if(!id){const q=await c.from('ly_ingredients').select('id').eq('name',captured.name).limit(1).maybeSingle();if(q?.error||!q?.data?.id)return;id=String(q.data.id);}
    const patch={purchase_unit:captured.purchaseUnit,conversion_ratio:captured.ratio};const r=await c.from('ly_ingredients').update(patch).eq('id',id);if(r?.error){console.warn('[Lát Yên] Không lưu được quy đổi lên Cloud',r.error);return;}
    try{if(typeof db!=='undefined'&&Array.isArray(db?.ingredients)){const item=db.ingredients.find(x=>String(x?.id||'')===id);if(item)Object.assign(item,patch);}}catch(e){}
    window.__lyUnitConversions?.saveIngredientRule?.(id,{baseUnit:captured.baseUnit,purchaseUnit:captured.purchaseUnit,ratio:captured.ratio});window.dispatchEvent(new CustomEvent('latyen:v2-ingredient-saved',{detail:{id,conversion:true}}));setTimeout(refreshTables,80);
  }
  function captureForm(){const name=document.getElementById('igName')?.value?.trim();const unitEl=document.getElementById('igUnit'),other=document.getElementById('igUnitOther');const baseUnit=unitEl?.value==='khác'?String(other?.value||'').trim():String(unitEl?.value||'').trim();const prepared=createMode==='prepared';const purchaseUnit=prepared?baseUnit:String(document.getElementById('igPurchaseUnit')?.value||baseUnit).trim();const ratio=prepared?1:Number(document.getElementById('igConversionRatio')?.value||1);return {name,baseUnit,purchaseUnit,ratio,mode:createMode};}

  function ingredientRow(id,name=''){const needle=String(id||'').trim(),nameKey=fold(name);for(const table of document.querySelectorAll('table.ingredient-stock-table:not(.prepared-virtual-table)'))for(const row of [...table.rows].slice(1)){if(needle&&[...row.querySelectorAll('[onclick],button')].some(el=>String(el.getAttribute('onclick')||'').includes(needle)))return row;if(nameKey&&fold(row.cells?.[1]?.textContent||'')===nameKey)return row;}return null;}
  function captureScrollState(){const boxes=[...document.querySelectorAll('#ingredients .scroll')].filter(el=>el.isConnected);return {pageY:window.scrollY,pageX:window.scrollX,boxes:boxes.map(el=>({el,top:el.scrollTop,left:el.scrollLeft}))};}
  function captureViewport(id,name){const row=ingredientRow(id,name),box=row?.closest?.('.scroll')||null;return {...captureScrollState(),id:String(id||''),name:String(name||''),rowTop:row?.getBoundingClientRect?.().top??null,box,boxTop:box?.scrollTop??null,boxLeft:box?.scrollLeft??null};}
  function ensureUXStyle(){
    let style=document.getElementById('lyIngredientSavedUX');if(!style){style=document.createElement('style');style.id='lyIngredientSavedUX';document.head.appendChild(style);}
    style.textContent=`
      .ingredient-stock-table tr.ly-ingredient-saved>td{animation:lyIngredientSaved 1.6s ease-out}
      @keyframes lyIngredientSaved{0%,25%{background:#ecfdf3;box-shadow:inset 3px 0 0 #12b76a}100%{background:transparent;box-shadow:none}}
      @media(prefers-reduced-motion:reduce){.ingredient-stock-table tr.ly-ingredient-saved>td{animation:none}}
    `;
  }
  function restoreScrollState(s){if(!s)return;(s.boxes||[]).forEach(i=>{if(i?.el?.isConnected){if(Number.isFinite(i.top))i.el.scrollTop=i.top;if(Number.isFinite(i.left))i.el.scrollLeft=i.left;}});if(Math.abs(window.scrollY-Number(s.pageY||0))>2)window.scrollTo({top:Number(s.pageY)||0,left:Number(s.pageX)||0,behavior:'auto'});}
  function restoreViewport(s){if(!s)return;const row=ingredientRow(s.id,s.name);(s.boxes||[]).forEach(i=>{if(i?.el?.isConnected){if(Number.isFinite(i.top))i.el.scrollTop=i.top;if(Number.isFinite(i.left))i.el.scrollLeft=i.left;}});if(s.box?.isConnected){if(Number.isFinite(s.boxTop))s.box.scrollTop=s.boxTop;if(Number.isFinite(s.boxLeft))s.box.scrollLeft=s.boxLeft;}if(row&&Number.isFinite(s.rowTop)){const delta=row.getBoundingClientRect().top-s.rowTop;if(Math.abs(delta)>4)window.scrollBy({top:delta,left:0,behavior:'auto'});row.classList.add('ly-ingredient-saved');setTimeout(()=>row.classList.remove('ly-ingredient-saved'),1700);}}
  function scheduleRestore(s,editMode=false){if(!s)return;requestAnimationFrame(()=>requestAnimationFrame(()=>editMode?restoreViewport(s):restoreScrollState(s)));}
  function captureCreateTrigger(event){const target=event.target?.closest?.('#btnPurchasedPanel,#btnPreparedPanel');if(!target)return;setCreateMode(target.id==='btnPreparedPanel'?'prepared':'purchased');const panel=document.getElementById('ingredientInlinePanel');const isAlreadyOpen=panel?.classList?.contains('open')&&!String(panel?.dataset?.editId||'').trim();if(!isAlreadyOpen)createViewport=captureScrollState();}
  function wrapSave(){const original=window.saveIngredient;if(typeof original!=='function'||original.__lyConversionWrapped)return false;const wrapped=async function(id){const captured=captureForm();const editId=String(id||document.getElementById('ingredientInlinePanel')?.dataset?.editId||'').trim();const viewport=editId?captureViewport(editId,captured.name):createViewport;const result=await original.apply(this,arguments);try{await persistCaptured(captured,id||'');}catch(e){console.warn('[Lát Yên] Lỗi đồng bộ quy đổi',e);}if(viewport)scheduleRestore(viewport,!!editId);if(!editId)createViewport=null;return result;};wrapped.__lyConversionWrapped=true;wrapped.__lyOriginal=original;window.saveIngredient=wrapped;return true;}
  let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{wrapSave();refreshTables();applyModeUX();ensureUXStyle();},60);};
  const boot=()=>{ensureUXStyle();wrapSave();refreshTables();applyModeUX();document.addEventListener('pointerdown',captureCreateTrigger,true);new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('latyen:v2-ingredient-saved',schedule);window.addEventListener('latyen:cloud-refreshed',schedule);setInterval(()=>{wrapSave();refreshTables();applyModeUX();},2500);};
  window.__lyIngredientConversionSync={version:VERSION,refreshTables,persistCaptured,restoreViewport,restoreScrollState,setCreateMode,getMode:()=>createMode};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
