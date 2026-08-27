(()=>{
  'use strict';
  if(window.__lyIngredientTableUX)return;
  const VERSION='2026.08.26.4';
  const fold=v=>String(v??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  let scheduled=false;

  function isSupplierHeader(text){
    const x=fold(text);
    return x.includes('nha cung cap gan nhat')||x==='nha cung cap'||x.includes('nha cung cap');
  }

  function removeSupplierColumn(table){
    const header=table?.rows?.[0];
    if(!header)return false;
    const indexes=[...header.cells]
      .map((cell,index)=>isSupplierHeader(cell.textContent)?index:-1)
      .filter(index=>index>=0)
      .sort((a,b)=>b-a);
    if(!indexes.length)return false;
    indexes.forEach(index=>{
      [...table.rows].forEach(row=>{if(row.cells?.[index])row.deleteCell(index);});
    });
    return true;
  }

  function installSafetyStyle(){
    let style=document.getElementById('lyIngredientTableUXStyle');
    if(!style){style=document.createElement('style');style.id='lyIngredientTableUXStyle';document.head.appendChild(style);}
    style.textContent=`
      #ingredients .scroll{width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:visible!important;scrollbar-width:auto!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table){width:max-content!important;min-width:100%!important;max-width:none!important;table-layout:auto!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) th,
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) td{box-sizing:border-box!important;max-width:none!important;white-space:normal!important;overflow:visible!important;word-break:normal!important;overflow-wrap:break-word!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) th:last-child,
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) td:last-child{min-width:112px!important;white-space:nowrap!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) td:last-child button{display:inline-block!important;width:auto!important;max-width:none!important;margin:2px!important;white-space:nowrap!important}
    `;
  }

  function apply(){
    scheduled=false;
    document.querySelectorAll('#ingredients table.ingredient-stock-table:not(.prepared-virtual-table)').forEach(table=>{
      removeSupplierColumn(table);
    });
  }

  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply);}

  function boot(){
    installSafetyStyle();apply();
    const root=document.getElementById('ingredients')||document.body;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    window.addEventListener('latyen:v2-ingredient-saved',schedule);
    window.addEventListener('latyen:cloud-refreshed',schedule);
  }

  window.__lyIngredientTableUX={version:VERSION,apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
