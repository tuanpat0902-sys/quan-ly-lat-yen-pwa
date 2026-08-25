(()=>{
  'use strict';
  if(window.__lyIngredientEditUX)return;

  const VERSION='2026.08.25.1';
  let wrappedOriginal=null;
  let restoreToken=0;

  const esc=value=>{
    try{return CSS.escape(String(value??''));}
    catch(e){return String(value??'').replace(/["\\]/g,'\\$&');}
  };

  function panel(){return document.getElementById('ingredientInlinePanel');}

  function currentEditId(idHint=''){
    return String(idHint||panel()?.dataset?.editId||'').trim();
  }

  function editedName(){
    return String(document.getElementById('igName')?.value||'').trim();
  }

  function ingredientTables(){
    return [...document.querySelectorAll('table.ingredient-stock-table:not(.prepared-virtual-table)')];
  }

  function rowFor(id,name=''){
    const needle=String(id||'').trim();
    if(needle){
      for(const table of ingredientTables()){
        for(const row of [...table.tBodies].flatMap(body=>[...body.rows])){
          if(row.dataset?.ingredientId===needle)return row;
          const controls=[...row.querySelectorAll('button,[onclick]')];
          if(controls.some(el=>String(el.getAttribute('onclick')||'').includes(needle)))return row;
        }
      }
    }
    const folded=String(name||'').trim().toLocaleLowerCase('vi');
    if(folded){
      for(const table of ingredientTables()){
        for(const row of [...table.tBodies].flatMap(body=>[...body.rows])){
          const rowName=String(row.cells?.[1]?.textContent||'').trim().toLocaleLowerCase('vi');
          if(rowName===folded)return row;
        }
      }
    }
    return null;
  }

  function capture(id,name){
    const row=rowFor(id,name);
    const scrollBox=row?.closest?.('.scroll')||null;
    return {
      id,
      name,
      rowTop:row?.getBoundingClientRect?.().top??null,
      pageY:window.scrollY,
      pageX:window.scrollX,
      scrollBox,
      boxTop:scrollBox?.scrollTop??null,
      boxLeft:scrollBox?.scrollLeft??null
    };
  }

  function flash(row){
    if(!row)return;
    row.classList.remove('ly-ingredient-row-saved');
    void row.offsetWidth;
    row.classList.add('ly-ingredient-row-saved');
    setTimeout(()=>row.classList.remove('ly-ingredient-row-saved'),1800);
  }

  function restore(snapshot,token){
    if(!snapshot||token!==restoreToken)return;
    const row=rowFor(snapshot.id,snapshot.name);
    if(snapshot.scrollBox?.isConnected){
      if(Number.isFinite(snapshot.boxTop))snapshot.scrollBox.scrollTop=snapshot.boxTop;
      if(Number.isFinite(snapshot.boxLeft))snapshot.scrollBox.scrollLeft=snapshot.boxLeft;
    }
    if(row&&Number.isFinite(snapshot.rowTop)){
      const nowTop=row.getBoundingClientRect().top;
      const delta=nowTop-snapshot.rowTop;
      if(Math.abs(delta)>1)window.scrollBy({top:delta,left:0,behavior:'auto'});
      flash(row);
      return;
    }
    window.scrollTo({top:snapshot.pageY,left:snapshot.pageX,behavior:'auto'});
  }

  function scheduleRestore(snapshot){
    const token=++restoreToken;
    const run=()=>restore(snapshot,token);
    requestAnimationFrame(()=>requestAnimationFrame(run));
    setTimeout(run,80);
    setTimeout(run,220);
    setTimeout(run,520);
  }

  function wrapSave(){
    const original=window.saveIngredient;
    if(typeof original!=='function')return false;
    if(original.__lyIngredientEditUXWrapped)return true;
    if(original===wrappedOriginal)return true;

    const wrapped=async function(id){
      const editId=currentEditId(id);
      const name=editedName();
      const snapshot=editId?capture(editId,name):null;
      let result;
      try{
        result=await original.apply(this,arguments);
      }finally{
        if(snapshot)scheduleRestore(snapshot);
      }
      return result;
    };
    wrapped.__lyIngredientEditUXWrapped=true;
    wrapped.__lyOriginal=original;
    wrappedOriginal=original;
    window.saveIngredient=wrapped;
    return true;
  }

  function addStyles(){
    if(document.getElementById('lyIngredientEditUXStyle'))return;
    const style=document.createElement('style');
    style.id='lyIngredientEditUXStyle';
    style.textContent=`
      .ingredient-stock-table tr.ly-ingredient-row-saved > td{
        animation:lyIngredientSavedFlash 1.8s ease-out;
      }
      @keyframes lyIngredientSavedFlash{
        0%,28%{background:#ecfdf3;box-shadow:inset 3px 0 0 #12b76a}
        100%{background:transparent;box-shadow:inset 0 0 0 transparent}
      }
      @media (prefers-reduced-motion: reduce){
        .ingredient-stock-table tr.ly-ingredient-row-saved > td{animation:none;background:#ecfdf3}
      }
    `;
    document.head.appendChild(style);
  }

  function boot(){
    addStyles();
    wrapSave();
    setInterval(wrapSave,1200);
    window.addEventListener('latyen:v2-ingredient-saved',()=>setTimeout(wrapSave,0));
  }

  window.__lyIngredientEditUX={version:VERSION,wrapSave,rowFor};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
