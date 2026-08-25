(()=>{
  'use strict';
  if(window.__lyIngredientTableFit)return;
  const VERSION='2026.08.26.1';
  const fold=v=>String(v??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  let timer=0;

  function isSupplierLabel(value){
    const x=fold(value);
    return x.includes('nha cung cap')||x.includes('ncc gan nhat')||x.includes('nha cung cap gan nhat');
  }

  function removeSupplierColumn(table){
    const header=table?.rows?.[0];
    if(!header)return false;
    const idx=[...header.cells].findIndex(cell=>isSupplierLabel(cell.textContent));
    if(idx<0)return false;
    [...table.rows].forEach(row=>{if(row.cells?.[idx])row.deleteCell(idx);});
    return true;
  }

  function tagColumns(table){
    const header=table?.rows?.[0];if(!header)return;
    const keyOf=value=>{
      const x=fold(value);
      if(x==='stt')return 'stt';
      if(x==='ten'||x.startsWith('ten '))return 'name';
      if(x.includes('mua/đong goi')||x.includes('mua/dong goi')||x.includes('don vi mua')||x.includes('dong goi'))return 'purchase';
      if(x==='don vi'||x.startsWith('don vi '))return 'unit';
      if(x==='ton'||x.startsWith('ton '))return 'stock';
      if(x.includes('toi thieu'))return 'minimum';
      if(x.includes('trang thai'))return 'status';
      if(x.includes('gia von'))return 'avgcost';
      if(x.includes('gia tri'))return 'value';
      if(x.includes('thao tac')||x.includes('hanh dong'))return 'actions';
      return '';
    };
    const keys=[...header.cells].map(cell=>keyOf(cell.textContent));
    [...header.cells].forEach((cell,i)=>{if(keys[i])cell.dataset.lyFitCol=keys[i];else delete cell.dataset.lyFitCol;});
    [...table.rows].slice(1).forEach(row=>[...row.cells].forEach((cell,i)=>{if(keys[i])cell.dataset.lyFitCol=keys[i];else delete cell.dataset.lyFitCol;}));
  }

  function fitTables(){
    document.querySelectorAll('#ingredients table.ingredient-stock-table:not(.prepared-virtual-table)').forEach(table=>{
      removeSupplierColumn(table);
      tagColumns(table);
    });
  }

  function installStyle(){
    let style=document.getElementById('lyIngredientTableFitStyle');
    if(!style){style=document.createElement('style');style.id='lyIngredientTableFitStyle';document.head.appendChild(style);}
    style.textContent=`
      #ingredients .scroll{width:100%!important;max-width:100%!important;overflow-x:hidden!important;scrollbar-width:none!important;overscroll-behavior-x:none!important}
      #ingredients .scroll::-webkit-scrollbar:horizontal{display:none!important;height:0!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table){width:100%!important;min-width:0!important;max-width:100%!important;table-layout:fixed!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) th,
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) td{min-width:0!important;max-width:none!important;box-sizing:border-box!important;padding:7px 5px!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;line-height:1.18!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) th{font-size:11px!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) td{font-size:11.5px!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-fit-col="stt"]{width:4%!important;text-align:center!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-fit-col="name"]{width:18%!important;font-weight:600!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-fit-col="unit"]{width:6%!important;text-align:center!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-fit-col="purchase"]{width:20%!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-fit-col="stock"]{width:8%!important;text-align:right!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-fit-col="minimum"]{width:9%!important;text-align:right!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-fit-col="status"]{width:10%!important;text-align:center!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-fit-col="avgcost"]{width:11%!important;text-align:right!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-fit-col="value"]{width:8%!important;text-align:right!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-fit-col="actions"]{width:6%!important;text-align:center!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) button{max-width:100%!important;padding:4px!important;font-size:10px!important;white-space:normal!important}
      @media(max-width:900px){
        #ingredients .scroll{overflow-x:hidden!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table){min-width:0!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) th{font-size:9.5px!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) td{font-size:10px!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) th,
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) td{padding:6px 3px!important}
      }
    `;
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(fitTables,40);}
  function boot(){
    installStyle();fitTables();
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('latyen:v2-ingredient-saved',schedule);
    window.addEventListener('latyen:cloud-refreshed',schedule);
    window.addEventListener('resize',schedule,{passive:true});
  }

  window.__lyIngredientTableFit={version:VERSION,fit:fitTables};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
