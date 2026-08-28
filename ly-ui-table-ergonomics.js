(()=>{
  'use strict';
  if(window.__lyUITableErgonomics?.version==='2026.08.28.1')return;
  const VERSION='2026.08.28.1';
  const STYLE_ID='lyUITableErgonomicsStyle';
  const fold=v=>String(v??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  const CSS=`
.scroll{width:100%!important;max-width:100%!important;height:auto!important;max-height:none!important;overflow-x:auto!important;overflow-y:visible!important;overscroll-behavior-x:contain;overscroll-behavior-y:auto;scrollbar-gutter:auto!important}
.scroll>table:not(.prepared-virtual-table){width:100%!important;min-width:0!important;max-width:100%!important;table-layout:auto!important}
table[data-ly-table-ux="1"] th,table[data-ly-table-ux="1"] td{box-sizing:border-box!important;min-width:0!important;max-width:none!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;word-break:normal!important;overflow-wrap:anywhere!important;line-height:1.42!important}
table[data-ly-table-ux="1"] th{vertical-align:bottom!important}
table[data-ly-table-ux="1"] td{vertical-align:top!important}
table[data-ly-table-ux="1"] [data-ly-cell-kind="number"],table[data-ly-table-ux="1"] [data-ly-cell-kind="date"],table[data-ly-table-ux="1"] [data-ly-cell-kind="status"]{white-space:nowrap!important;overflow-wrap:normal!important}
table[data-ly-table-ux="1"] [data-ly-cell-kind="actions"]{white-space:normal!important;min-width:96px!important}
table[data-ly-table-ux="1"] [data-ly-cell-kind="actions"] button{width:auto!important;max-width:100%!important;margin:2px!important;white-space:normal!important}
@media(min-width:761px){
  .scroll{overflow-x:hidden!important}
  table[data-ly-table-ux="1"]{font-size:13px!important}
  table[data-ly-table-ux="1"] th,table[data-ly-table-ux="1"] td{padding:9px 10px!important}
  table[data-ly-table-ux="1"] [data-ly-cell-kind="text-long"]{max-width:280px!important}
}
@media(max-width:760px){
  .scroll{overflow-x:hidden!important;border-radius:10px!important}
  table[data-ly-table-ux="1"]:not([data-ly-table-editable="1"]){display:block!important;width:100%!important;border:0!important;background:transparent!important}
  table[data-ly-table-ux="1"]:not([data-ly-table-editable="1"]) thead{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
  table[data-ly-table-ux="1"]:not([data-ly-table-editable="1"]) tbody{display:grid!important;gap:10px!important;width:100%!important}
  table[data-ly-table-ux="1"]:not([data-ly-table-editable="1"]) tbody tr{display:grid!important;grid-template-columns:minmax(104px,36%) minmax(0,1fr)!important;width:100%!important;padding:10px 12px!important;border:1px solid var(--border,#e4e7ec)!important;border-radius:12px!important;background:var(--card,#fff)!important;box-shadow:0 1px 2px rgba(16,24,40,.03)!important}
  table[data-ly-table-ux="1"]:not([data-ly-table-editable="1"]) tbody td{display:contents!important}
  table[data-ly-table-ux="1"]:not([data-ly-table-editable="1"]) tbody td::before{content:attr(data-ly-label);display:block!important;padding:7px 8px 7px 0!important;border-bottom:1px solid #eef2f4!important;color:#667085!important;font-size:12px!important;font-weight:700!important;line-height:1.35!important;overflow-wrap:anywhere!important}
  table[data-ly-table-ux="1"]:not([data-ly-table-editable="1"]) tbody td::after{content:attr(data-ly-value);display:block!important;padding:7px 0!important;border-bottom:1px solid #eef2f4!important;color:#344054!important;font-size:13px!important;line-height:1.42!important;white-space:normal!important;overflow-wrap:anywhere!important}
  table[data-ly-table-ux="1"]:not([data-ly-table-editable="1"]) tbody td:last-child::before,table[data-ly-table-ux="1"]:not([data-ly-table-editable="1"]) tbody td:last-child::after{border-bottom:0!important}
  table[data-ly-table-ux="1"][data-ly-table-editable="1"]{font-size:12px!important;table-layout:fixed!important}
  table[data-ly-table-ux="1"][data-ly-table-editable="1"] th,table[data-ly-table-ux="1"][data-ly-table-editable="1"] td{padding:7px 6px!important;white-space:normal!important;overflow-wrap:anywhere!important}
  table[data-ly-table-ux="1"][data-ly-table-editable="1"] input,table[data-ly-table-ux="1"][data-ly-table-editable="1"] select,table[data-ly-table-ux="1"][data-ly-table-editable="1"] textarea{width:100%!important;min-width:0!important;max-width:100%!important}
}
@media(max-width:430px){
  table[data-ly-table-ux="1"]:not([data-ly-table-editable="1"]) tbody tr{grid-template-columns:minmax(88px,34%) minmax(0,1fr)!important;padding:8px 10px!important}
  table[data-ly-table-ux="1"]:not([data-ly-table-editable="1"]) tbody td::before{font-size:11.5px!important;padding-right:6px!important}
  table[data-ly-table-ux="1"]:not([data-ly-table-editable="1"]) tbody td::after{font-size:12.5px!important}
}
`;
  function mountStyle(){let style=document.getElementById?.(STYLE_ID);if(!style){style=document.createElement?.('style');if(!style)return false;style.id=STYLE_ID;(document.head||document.documentElement)?.appendChild?.(style);}if(style.textContent!==CSS)style.textContent=CSS;return true;}
  function headerCells(table){const row=table.tHead?.rows?.[0]||[...table.rows||[]].find(r=>r.querySelector?.('th'));return row?[...row.cells]:[];}
  function classifyHeader(text,index,count){const x=fold(text);if(/(thao tac|hanh dong|action|xoa|sua)/.test(x)||index===count-1&&/(xoa|sua|chi tiet|xem)/.test(x))return'actions';if(/(so luong|sl|ton|gia|tien|tong|doanh thu|chi phi|luong|percent|%|stt)/.test(x))return'number';if(/(ngay|gio|thoi gian|created|updated)/.test(x))return'date';if(/(trang thai|status)/.test(x))return'status';if(/(ghi chu|mo ta|dia chi|noi dung|ly do)/.test(x))return'text-long';return'text';}
  function enhance(table){if(!table||table.classList?.contains('prepared-virtual-table'))return false;const headers=headerCells(table);if(headers.length<2)return false;table.dataset.lyTableUx='1';const editable=!!table.querySelector?.('input,select,textarea,[contenteditable="true"]');if(editable)table.dataset.lyTableEditable='1';else delete table.dataset.lyTableEditable;const labels=headers.map((cell,i)=>String(cell.textContent||`Cột ${i+1}`).trim()||`Cột ${i+1}`);const kinds=labels.map((label,i)=>classifyHeader(label,i,labels.length));[...table.rows].forEach((row,rowIndex)=>{if(row.parentElement?.tagName==='THEAD'||rowIndex===0&&row.querySelector?.('th'))return;[...row.cells].forEach((cell,i)=>{cell.dataset.lyLabel=labels[i]||`Cột ${i+1}`;cell.dataset.lyCellKind=kinds[i]||'text';if(!editable)cell.dataset.lyValue=String(cell.textContent||'').trim()||'—';});});headers.forEach((cell,i)=>{cell.dataset.lyCellKind=kinds[i]||'text';});return true;}
  let scheduled=false;
  function apply(){scheduled=false;mountStyle();document.querySelectorAll?.('.scroll > table, .panel table')?.forEach?.(enhance);}
  function schedule(){if(scheduled)return;scheduled=true;(window.requestAnimationFrame||setTimeout)(apply);}
  function boot(){apply();[80,300,900,1800].forEach(ms=>setTimeout(apply,ms));window.addEventListener?.('latyen:panel',schedule);window.addEventListener?.('latyen:cloud-refreshed',schedule);window.addEventListener?.('latyen:ui-rescued',schedule);window.addEventListener?.('resize',schedule,{passive:true});}
  window.__lyUITableErgonomics=Object.freeze({version:VERSION,apply,status:()=>({version:VERSION,tables:document.querySelectorAll?.('table[data-ly-table-ux="1"]')?.length||0})});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
