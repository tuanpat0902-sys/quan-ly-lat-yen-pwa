(()=>{
  'use strict';
  if(window.__lyIngredientTableUX)return;
  const VERSION='2026.08.26.1';
  const fold=v=>String(v??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  let scheduled=false;

  function isSupplierHeader(text){
    const x=fold(text);
    return x.includes('nha cung cap gan nhat')||x==='nha cung cap'||x.includes('nha cung cap');
  }

  function cleanTable(table){
    const header=table?.rows?.[0];
    if(!header)return false;
    const headers=[...header.cells];
    const indexes=headers.map((cell,index)=>isSupplierHeader(cell.textContent)?index:-1).filter(index=>index>=0);
    if(!indexes.length)return false;
    indexes.sort((a,b)=>b-a).forEach(index=>{
      [...table.rows].forEach(row=>row.cells?.[index]?.remove());
    });
    try{window.__lyIngredientConversionSync?.refreshTables?.();}catch(e){}
    return true;
  }

  function apply(){
    scheduled=false;
    document.querySelectorAll('#ingredients table.ingredient-stock-table:not(.prepared-virtual-table)').forEach(cleanTable);
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(apply);
  }

  function boot(){
    apply();
    const root=document.getElementById('ingredients')||document.body;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    window.addEventListener('latyen:v2-ingredient-saved',schedule);
    window.addEventListener('latyen:cloud-refreshed',schedule);
    setInterval(apply,3000);
  }

  window.__lyIngredientTableUX={version:VERSION,apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
