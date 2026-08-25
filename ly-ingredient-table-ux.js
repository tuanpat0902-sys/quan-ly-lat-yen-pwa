(()=>{
  'use strict';
  if(window.__lyIngredientTableUX)return;
  const VERSION='2026.08.26.2';
  const fold=v=>String(v??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  let scheduled=false;

  function isSupplierHeader(text){
    const x=fold(text);
    return x.includes('nha cung cap gan nhat')||x==='nha cung cap'||x.includes('nha cung cap');
  }

  function keyOf(text){
    const x=fold(text);
    if(x==='stt')return 'stt';
    if(x==='ten'||x.startsWith('ten '))return 'name';
    if(x.includes('don vi mua')||x.includes('dong goi'))return 'purchase';
    if(x==='don vi'||x.startsWith('don vi '))return 'unit';
    if(x==='ton'||x.startsWith('ton '))return 'stock';
    if(x.includes('toi thieu'))return 'minimum';
    if(x.includes('trang thai'))return 'status';
    if(x.includes('gia von'))return 'avgcost';
    if(x.includes('gia tri'))return 'value';
    if(x.includes('thao tac')||x.includes('hanh dong'))return 'actions';
    return '';
  }

  function removeSupplierColumn(table){
    const header=table?.rows?.[0];
    if(!header)return false;
    const indexes=[...header.cells].map((cell,index)=>isSupplierHeader(cell.textContent)?index:-1).filter(index=>index>=0).sort((a,b)=>b-a);
    if(!indexes.length)return false;
    indexes.forEach(index=>[...table.rows].forEach(row=>{if(row.cells?.[index])row.deleteCell(index);}));
    return true;
  }

  function tagColumns(table){
    const header=table?.rows?.[0];if(!header)return;
    const keys=[...header.cells].map(cell=>keyOf(cell.textContent));
    [...header.cells].forEach((cell,i)=>{if(keys[i])cell.dataset.lyIngredientCol=keys[i];else delete cell.dataset.lyIngredientCol;});
    [...table.rows].slice(1).forEach(row=>[...row.cells].forEach((cell,i)=>{if(keys[i])cell.dataset.lyIngredientCol=keys[i];else delete cell.dataset.lyIngredientCol;}));
  }

  function cleanTable(table){
    removeSupplierColumn(table);
    tagColumns(table);
  }

  function installStyle(){
    let style=document.getElementById('lyIngredientTableUXStyle');
    if(!style){style=document.createElement('style');style.id='lyIngredientTableUXStyle';document.head.appendChild(style);}
    style.textContent=`
      #ingredients .scroll{width:100%!important;max-width:100%!important;overflow-x:hidden!important;overscroll-behavior-x:none!important;scrollbar-width:none!important}
      #ingredients .scroll::-webkit-scrollbar:horizontal{display:none!important;height:0!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table){width:100%!important;min-width:0!important;max-width:100%!important;table-layout:fixed!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) th,
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) td{box-sizing:border-box!important;min-width:0!important;max-width:none!important;padding:7px 5px!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;line-height:1.18!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) th{font-size:11px!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) td{font-size:11.5px!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-col="stt"]{width:4%!important;text-align:center!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-col="name"]{width:18%!important;font-weight:600!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-col="unit"]{width:6%!important;text-align:center!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-col="purchase"]{width:20%!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-col="stock"]{width:8%!important;text-align:right!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-col="minimum"]{width:9%!important;text-align:right!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-col="status"]{width:10%!important;text-align:center!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-col="avgcost"]{width:11%!important;text-align:right!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-col="value"]{width:8%!important;text-align:right!important}
      #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) [data-ly-ingredient-col="actions"]{width:6%!important;text-align:center!important}
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
    installStyle();apply();
    const root=document.getElementById('ingredients')||document.body;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    window.addEventListener('latyen:v2-ingredient-saved',schedule);
    window.addEventListener('latyen:cloud-refreshed',schedule);
    window.addEventListener('resize',schedule,{passive:true});
    setInterval(apply,3000);
  }

  window.__lyIngredientTableUX={version:VERSION,apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
