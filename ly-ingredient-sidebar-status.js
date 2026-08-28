(()=>{
  'use strict';
  if(window.__lyIngredientSidebarStatus)return;
  const VERSION='2026.08.29.1';
  let timer=0;

  const fold=v=>String(v??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');

  function currentRows(){
    try{
      if(typeof purchasedWarehouseIngredientsInDisplayOrder==='function'){
        return purchasedWarehouseIngredientsInDisplayOrder()||[];
      }
    }catch(e){}
    try{
      if(typeof warehouseIngredients==='function'){
        return (warehouseIngredients()||[]).filter(item=>(item?.ingredient_type||'purchased')==='purchased');
      }
    }catch(e){}
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
        <div class="ly-sidebar-stock-status-head">Trạng thái kho</div>
        <div class="ly-sidebar-stock-status-grid">
          <button type="button" data-stock-filter="ok"><span class="dot ok"></span><span>Đủ hàng</span><b>0</b></button>
          <button type="button" data-stock-filter="low"><span class="dot low"></span><span>Sắp hết</span><b>0</b></button>
          <button type="button" data-stock-filter="critical"><span class="dot critical"></span><span>Cần nhập</span><b>0</b></button>
          <button type="button" data-stock-filter="out"><span class="dot out"></span><span>Hết hàng</span><b>0</b></button>
        </div>`;
      box.addEventListener('click',event=>{const button=event.target.closest('button[data-stock-filter]');if(button)openIngredients(button.dataset.stockFilter);});
      label.before(box);
    }else if(box.nextElementSibling!==label){label.before(box);}
    const s=summary();
    ['ok','low','critical','out'].forEach(key=>{
      const button=box.querySelector(`[data-stock-filter="${key}"]`);if(!button)return;
      const value=Number(s[key]||0);button.querySelector('b').textContent=value;
      button.classList.toggle('has-items',value>0);
    });
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

  function ensureChatUnitSync(){
    if(window.__lyChatUnitSync||document.querySelector('script[data-ly-chat-unit-sync]'))return;
    const script=document.createElement('script');script.src='./ly-chat-unit-sync.js?v=20260826.6';script.async=true;script.dataset.lyChatUnitSync='1';
    (document.head||document.documentElement).appendChild(script);
  }

  function ensureChatStockUnitDisplay(){
    if(window.__lyChatStockUnitDisplay||document.querySelector('script[data-ly-chat-stock-unit-display]'))return;
    const script=document.createElement('script');script.src='./ly-chat-stock-unit-display.js?v=20260826.1';script.async=true;script.dataset.lyChatStockUnitDisplay='1';
    (document.head||document.documentElement).appendChild(script);
  }

  function ensureStyle(){
    let style=document.getElementById('lyIngredientSidebarStatusStyle');
    if(!style){style=document.createElement('style');style.id='lyIngredientSidebarStatusStyle';document.head.appendChild(style);}
    style.textContent=`
      .ly-sidebar-stock-status{margin:4px 0 12px;padding:8px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}
      .ly-sidebar-stock-status-head{font-size:12px;font-weight:800;color:#334155;margin:0 0 7px;padding:0 2px}
      .ly-sidebar-stock-status-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
      .ly-sidebar-stock-status button{display:grid!important;grid-template-columns:auto 1fr auto;align-items:center;gap:6px;width:100%!important;padding:7px 8px!important;margin:0!important;border:1px solid #e5e7eb!important;border-radius:9px!important;background:#fff!important;color:#334155!important;font-size:11px!important;text-align:left!important;white-space:nowrap!important;transform:translateY(0);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease;animation:lyStockRowIn .34s ease both}
      .ly-sidebar-stock-status button:nth-child(1){animation-delay:.02s}.ly-sidebar-stock-status button:nth-child(2){animation-delay:.08s}.ly-sidebar-stock-status button:nth-child(3){animation-delay:.14s}.ly-sidebar-stock-status button:nth-child(4){animation-delay:.20s}
      .ly-sidebar-stock-status button:hover{transform:translateY(-1px);box-shadow:0 5px 12px rgba(15,23,42,.09);border-color:#cbd5e1!important;background:#fdfefe!important}
      .ly-sidebar-stock-status button:active{transform:translateY(0) scale(.985)}
      .ly-sidebar-stock-status button b{font-size:12px;color:#0f172a;transition:transform .2s ease}
      .ly-sidebar-stock-status button:hover b{transform:scale(1.12)}
      .ly-sidebar-stock-status .dot{width:8px;height:8px;border-radius:50%;display:inline-block;position:relative}
      .ly-sidebar-stock-status .dot.ok{background:#16a34a}.ly-sidebar-stock-status .dot.low{background:#eab308}.ly-sidebar-stock-status .dot.critical{background:#f97316}.ly-sidebar-stock-status .dot.out{background:#dc2626}
      .ly-sidebar-stock-status button[data-stock-filter="low"].has-items .dot{animation:lyStockSoftPulse 2.2s ease-in-out infinite}
      .ly-sidebar-stock-status button[data-stock-filter="critical"].has-items .dot{animation:lyStockPulse 1.45s ease-in-out infinite}
      .ly-sidebar-stock-status button[data-stock-filter="out"].has-items .dot{animation:lyStockPulse 1s ease-in-out infinite}
      .ly-sidebar-stock-status button[data-stock-filter="critical"].has-items,.ly-sidebar-stock-status button[data-stock-filter="out"].has-items{animation:lyStockRowIn .34s ease both,lyStockAttention 3.2s ease-in-out 1s infinite}
      @keyframes lyStockRowIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
      @keyframes lyStockSoftPulse{0%,100%{box-shadow:0 0 0 0 rgba(234,179,8,0)}50%{box-shadow:0 0 0 4px rgba(234,179,8,.14)}}
      @keyframes lyStockPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 currentColor}50%{transform:scale(1.18);box-shadow:0 0 0 5px rgba(249,115,22,.08)}}
      @keyframes lyStockAttention{0%,84%,100%{box-shadow:none}90%{box-shadow:0 0 0 2px rgba(249,115,22,.10)}}
      .prepared-recipe-head,#preparedRecipeLines .prepared-recipe-line{grid-template-columns:42px minmax(185px,1.5fr) 72px 115px minmax(185px,1.1fr) 36px!important}
      .ly-prepared-index-head,.ly-prepared-index{display:flex;align-items:center;justify-content:center;font-weight:700;color:#64748b}
      @media(max-width:700px){.ly-prepared-index{grid-column:1/-1!important;justify-content:flex-start;margin-bottom:-2px}.ly-prepared-index::before{content:'STT ';margin-right:4px;color:#64748b}}
      @media(prefers-reduced-motion:reduce){.ly-sidebar-stock-status button,.ly-sidebar-stock-status .dot{animation:none!important;transition:none!important}}
    `;
  }

  function apply(){ensureSidebar();numberPreparedLines();ensureChatUnitSync();ensureChatStockUnitDisplay();}
  function schedule(){clearTimeout(timer);timer=setTimeout(apply,60);}
  function boot(){ensureStyle();apply();new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('latyen:cloud-refreshed',schedule);window.addEventListener('latyen:v2-ingredient-saved',schedule);window.addEventListener('latyen:v2-hydrated',schedule);}

  window.__lyIngredientSidebarStatus={version:VERSION,apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
