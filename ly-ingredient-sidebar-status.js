(()=>{
  'use strict';
  if(window.__lyIngredientSidebarStatus)return;
  const VERSION='2026.08.26.1';
  let timer=0;

  const fold=v=>String(v??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');

  function currentRows(){
    try{if(typeof warehouseIngredients==='function')return warehouseIngredients()||[];}catch(e){}
    try{if(typeof db!=='undefined'&&Array.isArray(db?.ingredients))return db.ingredients;}catch(e){}
    return [];
  }

  function statusOf(item){
    try{if(typeof ingredientStockStatus==='function')return ingredientStockStatus(item);}catch(e){}
    let qty=0;try{if(typeof stock==='function')qty=Number(stock(item?.id)||0);}catch(e){}
    const min=Math.max(0,Number(item?.minimum_stock||0));
    if(qty<=0)return {key:'out'};
    if(min>0&&qty<=min)return {key:'critical'};
    if(min>0&&qty<=min*1.5)return {key:'low'};
    return {key:'ok'};
  }

  function summary(){
    const out={ok:0,low:0,critical:0,out:0};
    currentRows().forEach(item=>{const key=statusOf(item)?.key;if(Object.prototype.hasOwnProperty.call(out,key))out[key]++;});
    return out;
  }

  function openIngredients(key){
    try{
      const navButton=document.querySelector('#nav button[data-panel="ingredients"]');
      if(typeof showTab==='function')showTab('ingredients',navButton||undefined);
      else navButton?.click?.();
      setTimeout(()=>{
        try{
          if(typeof toggleIngredientStockFilter==='function')toggleIngredientStockFilter(key);
          const panel=document.getElementById('ingredients');
          if(panel)panel.scrollIntoView({block:'start',behavior:'smooth'});
        }catch(e){}
      },80);
    }catch(e){}
  }

  function ensureSidebar(){
    const nav=document.getElementById('nav');if(!nav)return;
    const label=[...nav.querySelectorAll('.v238-nav-section-label')].find(el=>fold(el.textContent)==='nghiep vu');
    if(!label)return;
    let box=document.getElementById('lySidebarStockStatus');
    if(!box){
      box=document.createElement('div');
      box.id='lySidebarStockStatus';
      box.className='ly-sidebar-stock-status';
      box.innerHTML=`
        <button type="button" data-stock-filter="ok"><span class="dot ok"></span><span>Đủ hàng</span><b>0</b></button>
        <button type="button" data-stock-filter="low"><span class="dot low"></span><span>Sắp hết</span><b>0</b></button>
        <button type="button" data-stock-filter="critical"><span class="dot critical"></span><span>Cần nhập</span><b>0</b></button>
        <button type="button" data-stock-filter="out"><span class="dot out"></span><span>Hết hàng</span><b>0</b></button>`;
      box.addEventListener('click',event=>{const button=event.target.closest('button[data-stock-filter]');if(button)openIngredients(button.dataset.stockFilter);});
      label.before(box);
    }else if(box.nextElementSibling!==label){label.before(box);}
    const s=summary();
    box.querySelector('[data-stock-filter="ok"] b').textContent=s.ok;
    box.querySelector('[data-stock-filter="low"] b').textContent=s.low;
    box.querySelector('[data-stock-filter="critical"] b').textContent=s.critical;
    box.querySelector('[data-stock-filter="out"] b').textContent=s.out;
  }

  function numberPreparedLines(){
    const holder=document.getElementById('preparedRecipeLines');if(!holder)return;
    const head=holder.previousElementSibling;
    if(head?.classList?.contains('prepared-recipe-head')&&!head.querySelector('.ly-prepared-index-head')){
      const span=document.createElement('span');span.className='ly-prepared-index-head';span.textContent='STT';head.prepend(span);
    }
    [...holder.querySelectorAll('.prepared-recipe-line')].forEach((row,index)=>{
      let badge=row.querySelector(':scope > .ly-prepared-index');
      if(!badge){badge=document.createElement('span');badge.className='ly-prepared-index';row.prepend(badge);}
      badge.textContent=String(index+1);
    });
  }

  function ensureStyle(){
    let style=document.getElementById('lyIngredientSidebarStatusStyle');
    if(!style){style=document.createElement('style');style.id='lyIngredientSidebarStatusStyle';document.head.appendChild(style);}
    style.textContent=`
      .ly-sidebar-stock-status{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:4px 0 12px;padding:8px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}
      .ly-sidebar-stock-status button{display:grid!important;grid-template-columns:auto 1fr auto;align-items:center;gap:6px;width:100%!important;padding:7px 8px!important;margin:0!important;border:1px solid #e5e7eb!important;border-radius:9px!important;background:#fff!important;color:#334155!important;font-size:11px!important;text-align:left!important;white-space:nowrap!important}
      .ly-sidebar-stock-status button b{font-size:12px;color:#0f172a}
      .ly-sidebar-stock-status .dot{width:8px;height:8px;border-radius:50%;display:inline-block}
      .ly-sidebar-stock-status .dot.ok{background:#16a34a}.ly-sidebar-stock-status .dot.low{background:#eab308}.ly-sidebar-stock-status .dot.critical{background:#f97316}.ly-sidebar-stock-status .dot.out{background:#dc2626}
      .prepared-recipe-head,#preparedRecipeLines .prepared-recipe-line{grid-template-columns:42px minmax(185px,1.5fr) 72px 115px minmax(185px,1.1fr) 36px!important}
      .ly-prepared-index-head,.ly-prepared-index{display:flex;align-items:center;justify-content:center;font-weight:700;color:#64748b}
      @media(max-width:700px){.ly-prepared-index{grid-column:1/-1!important;justify-content:flex-start;margin-bottom:-2px}.ly-prepared-index::before{content:'STT ';margin-right:4px;color:#64748b}}
    `;
  }

  function apply(){ensureSidebar();numberPreparedLines();}
  function schedule(){clearTimeout(timer);timer=setTimeout(apply,60);}
  function boot(){ensureStyle();apply();new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('latyen:cloud-refreshed',schedule);window.addEventListener('latyen:v2-ingredient-saved',schedule);setInterval(apply,2500);}

  window.__lyIngredientSidebarStatus={version:VERSION,apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
