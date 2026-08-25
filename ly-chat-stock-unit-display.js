(()=>{
  'use strict';
  if(window.__lyChatStockUnitDisplay)return;
  const VERSION='2026.08.26.1';
  let timer=0;
  const esc=value=>String(value??'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

  function rows(){
    try{if(typeof db!=='undefined'&&Array.isArray(db?.ingredients))return db.ingredients.filter(row=>row?.active!==false);}catch(e){}
    return [];
  }
  function stockMessage(el){
    const text=String(el?.textContent||'');
    return /tồn nhiều nhất là|đã kiểm tra kho|kiểm tra tồn kho/i.test(text);
  }
  function addUnitsToText(text){
    let out=String(text||'');
    const items=rows().filter(row=>String(row?.name||'').trim()&&String(row?.unit||'').trim()).sort((a,b)=>String(b.name).length-String(a.name).length);
    for(const item of items){
      const name=String(item.name).trim(),unit=String(item.unit).trim();
      const re=new RegExp(`(${esc(name)}\\s+)(-?\\d[\\d.,]*)(?!\\s*(?:${esc(unit)}|kg|g|mg|ml|l|cái|chiếc|hộp|gói|túi|thùng|chai|lon|hũ|lọ|khay|vỉ|bộ|phần|suất)\\b)`,'giu');
      out=out.replace(re,`$1$2 ${unit}`);
    }
    return out;
  }
  function processMessage(el){
    if(!el||el.classList?.contains('is-user')||!stockMessage(el))return;
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode(node){
      const parent=node.parentElement;
      if(!parent||parent.closest('button,.ly-assistant-draft,.ly-assistant-choice'))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const next=addUnitsToText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;});
  }
  function apply(){document.querySelectorAll('#lyAssistantMessages .ly-assistant-message').forEach(processMessage);}
  function schedule(){clearTimeout(timer);timer=setTimeout(apply,30);}
  function boot(){apply();new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});}
  window.__lyChatStockUnitDisplay={version:VERSION,apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
