(()=>{
  'use strict';
  if(window.__lyIngredientTableUX)return;
  const VERSION='2026.08.29.5';
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
      #ingredients .scroll:has(>table.ingredient-stock-table:not(.prepared-virtual-table)){width:100%!important;max-width:100%!important;overflow:auto!important;scrollbar-gutter:stable!important;scrollbar-width:auto!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table){width:100%!important;min-width:1040px!important;max-width:none!important;table-layout:fixed!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) th,
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) td{box-sizing:border-box!important;min-width:0!important;max-width:none!important;white-space:normal!important;overflow:hidden!important;word-break:normal!important;overflow-wrap:break-word!important;text-overflow:ellipsis!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-column="stt"]{width:5%!important;text-align:center!important;white-space:nowrap!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-column="name"]{width:14%!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-column="unit"]{width:7%!important;text-align:center!important;white-space:nowrap!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-column="purchase"]{width:17%!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-column="stock"]{width:7%!important;white-space:nowrap!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-column="minimum"]{width:7%!important;white-space:nowrap!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-column="status"]{width:10%!important;white-space:nowrap!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-column="cost"]{width:11%!important;white-space:nowrap!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-column="value"]{width:9%!important;white-space:nowrap!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-column="actions"]{width:13%!important;white-space:nowrap!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) th:last-child,
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) td:last-child{min-width:112px!important;white-space:nowrap!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) td:last-child button{display:inline-block!important;width:auto!important;max-width:none!important;margin:2px!important;white-space:nowrap!important}
    `;
  }

  function columnKey(cell,index,total){
    const value=fold(cell?.textContent);
    if(index===total-1||!value)return 'actions';
    if(value==='stt')return 'stt';
    if(value==='ten')return 'name';
    if(value==='don vi')return 'unit';
    if(value.includes('mua/dong goi')||value.includes('don vi mua/dong goi'))return 'purchase';
    if(value==='ton')return 'stock';
    if(value.includes('toi thieu'))return 'minimum';
    if(value.includes('trang thai'))return 'status';
    if(value.includes('gia von'))return 'cost';
    if(value==='gia tri')return 'value';
    return `column-${index+1}`;
  }

  function markStableColumns(table){
    const header=table?.rows?.[0];
    if(!header)return false;
    const keys=[...header.cells].map((cell,index)=>columnKey(cell,index,header.cells.length));
    [...table.rows].forEach(row=>{
      [...row.cells].forEach((cell,index)=>{
        if(keys[index])cell.dataset.lyIngredientColumn=keys[index];
      });
    });
    table.dataset.lyIngredientStableLayout='1';
    return true;
  }

  function apply(){
    scheduled=false;
    try{window.__lyUnitConversions?.enhanceIngredientTables?.();}catch(_){}
    document.querySelectorAll('#ingredients table.ingredient-stock-table:not(.prepared-virtual-table)').forEach(table=>{
      removeSupplierColumn(table);
      markStableColumns(table);
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
