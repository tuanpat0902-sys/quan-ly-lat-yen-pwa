(()=>{
  'use strict';
  if(window.__lyIngredientTableUX)return;
  const VERSION='2026.08.30.1';
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
      #ingredients .scroll:has(>table.prepared-virtual-table),#ingredients .scroll:has(>table.ingredient-usage-table){width:100%!important;max-width:100%!important;overflow:auto!important;scrollbar-gutter:stable!important}
      #ingredients table.prepared-virtual-table{width:100%!important;min-width:900px!important;max-width:none!important;table-layout:fixed!important}
      #ingredients table.prepared-virtual-table [data-ly-prepared-column="stt"]{width:5%!important}
      #ingredients table.prepared-virtual-table [data-ly-prepared-column="name"]{width:21%!important}
      #ingredients table.prepared-virtual-table [data-ly-prepared-column="unit"]{width:7%!important}
      #ingredients table.prepared-virtual-table [data-ly-prepared-column="output"]{width:18%!important}
      #ingredients table.prepared-virtual-table [data-ly-prepared-column="cost"]{width:14%!important}
      #ingredients table.prepared-virtual-table [data-ly-prepared-column="formula"]{width:25%!important}
      #ingredients table.prepared-virtual-table [data-ly-prepared-column="actions"]{width:10%!important}
      #ingredients table.ingredient-usage-table{width:100%!important;min-width:900px!important;max-width:none!important;table-layout:fixed!important}
      #ingredients table.ingredient-usage-table [data-ly-usage-column="stt"]{width:5%!important}
      #ingredients table.ingredient-usage-table [data-ly-usage-column="time"]{width:14%!important}
      #ingredients table.ingredient-usage-table [data-ly-usage-column="name"]{width:25%!important}
      #ingredients table.ingredient-usage-table [data-ly-usage-column="unit"]{width:7%!important}
      #ingredients table.ingredient-usage-table [data-ly-usage-column="source"]{width:12%!important}
      #ingredients table.ingredient-usage-table [data-ly-usage-column="reference"]{width:10%!important}
      #ingredients table.ingredient-usage-table [data-ly-usage-column="quantity"]{width:13%!important}
      #ingredients table.ingredient-usage-table [data-ly-usage-column="note"]{width:14%!important}
      @media(max-width:0px){
        #ingredients .scroll:has(>table.ingredient-stock-table:not(.prepared-virtual-table)){overflow-x:hidden!important;max-height:min(62dvh,600px)!important;overflow-y:auto!important;scrollbar-gutter:auto!important;padding:0 2px 2px!important;border:0!important;background:transparent!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table){display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;table-layout:auto!important;border:0!important;background:transparent!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table) thead,#ingredients table.ingredient-stock-table:not(.prepared-virtual-table)>tbody>tr:first-child:has(th){position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table)>tbody{display:grid!important;width:100%!important;gap:8px!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table)>tbody>tr{display:block!important;width:100%!important;border:1px solid var(--border,#e4e7ec)!important;border-left:3px solid #d0d5dd!important;border-radius:11px!important;background:var(--card,#fff)!important;overflow:hidden!important;contain:layout paint}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table)>tbody>tr>td{display:grid!important;grid-template-columns:minmax(94px,35%) minmax(0,1fr)!important;column-gap:8px!important;align-items:start!important;width:100%!important;min-width:0!important;max-width:100%!important;padding:7px 9px!important;border-bottom:1px solid #eef2f4!important;background:transparent!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;text-align:left!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table)>tbody>tr>td[data-ly-ingredient-column]{width:100%!important;min-width:0!important;max-width:100%!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table)>tbody>tr>td::before{content:attr(data-ly-label);display:block!important;color:#667085!important;font-size:11.5px!important;font-weight:700!important;line-height:1.35!important;text-align:left!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table)>tbody>tr>td:last-child{display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:wrap!important;gap:4px!important;min-width:0!important;border-bottom:0!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table)>tbody>tr>td:last-child::before{flex:0 0 calc(35% - 4px)!important}
        #ingredients table.ingredient-stock-table:not(.prepared-virtual-table)>tbody>tr>td:last-child button{min-height:32px!important;margin:1px!important}
        #ingredients .scroll:has(>table.prepared-virtual-table),#ingredients .scroll:has(>table.ingredient-usage-table){overflow-x:hidden!important;max-height:min(62dvh,600px)!important;overflow-y:auto!important;scrollbar-gutter:auto!important;padding:0 2px 2px!important;border:0!important;background:transparent!important}
        #ingredients table.prepared-virtual-table,#ingredients table.ingredient-usage-table{display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;table-layout:auto!important;border:0!important;background:transparent!important}
        #ingredients table.prepared-virtual-table>thead,#ingredients table.ingredient-usage-table>thead,#ingredients table.prepared-virtual-table>tbody>tr:first-child:has(th),#ingredients table.ingredient-usage-table>tbody>tr:first-child:has(th){position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
        #ingredients table.prepared-virtual-table>tbody,#ingredients table.ingredient-usage-table>tbody{display:grid!important;width:100%!important;gap:8px!important}
        #ingredients table.prepared-virtual-table>tbody>tr:not(:first-child),#ingredients table.ingredient-usage-table>tbody>tr:not(:first-child){display:block!important;width:100%!important;border:1px solid var(--border,#e4e7ec)!important;border-radius:11px!important;background:var(--card,#fff)!important;overflow:hidden!important;contain:layout paint}
        #ingredients table.prepared-virtual-table>tbody>tr>td,#ingredients table.ingredient-usage-table>tbody>tr>td{display:grid!important;grid-template-columns:minmax(94px,35%) minmax(0,1fr)!important;column-gap:8px!important;align-items:start!important;width:100%!important;min-width:0!important;max-width:100%!important;padding:7px 9px!important;border-bottom:1px solid #eef2f4!important;background:transparent!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;text-align:left!important}
        #ingredients table.prepared-virtual-table>tbody>tr>td[data-ly-prepared-column],#ingredients table.ingredient-usage-table>tbody>tr>td[data-ly-usage-column]{width:100%!important;min-width:0!important;max-width:100%!important}
        #ingredients table.prepared-virtual-table>tbody>tr>td::before,#ingredients table.ingredient-usage-table>tbody>tr>td::before{content:attr(data-ly-label);display:block!important;color:#667085!important;font-size:11.5px!important;font-weight:700!important;line-height:1.35!important;text-align:left!important}
        #ingredients table.prepared-virtual-table>tbody>tr>td:last-child,#ingredients table.ingredient-usage-table>tbody>tr>td:last-child{border-bottom:0!important}
      }
    `;
  }

  function markColumns(table,attribute,keys){
    const header=table?.rows?.[0];if(!header)return false;
    const labels=[...header.cells].map(cell=>String(cell.textContent||'').trim()||'Thao tác');
    [...table.rows].forEach((row,rowIndex)=>[...row.cells].forEach((cell,index)=>{
      const key=keys[index]||`column-${index+1}`;
      cell.dataset[attribute]=key;
      if(rowIndex>0)cell.dataset.lyLabel=labels[index]||'Thao tác';
    }));
    return true;
  }

  function markSupportingTables(){
    document.querySelectorAll('#ingredients table.prepared-virtual-table').forEach(table=>markColumns(table,'lyPreparedColumn',['stt','name','unit','output','cost','formula','actions']));
    document.querySelectorAll('#ingredients table.ingredient-usage-table').forEach(table=>markColumns(table,'lyUsageColumn',['stt','time','name','unit','source','reference','quantity','note']));
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
    const labels=[...header.cells].map(cell=>String(cell.textContent||'').trim()||'Thao tác');
    [...table.rows].forEach((row,rowIndex)=>{
      [...row.cells].forEach((cell,index)=>{
        if(keys[index])cell.dataset.lyIngredientColumn=keys[index];
        if(rowIndex>0)cell.dataset.lyLabel=labels[index]||'Thao tác';
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
    markSupportingTables();
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
