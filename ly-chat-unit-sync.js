(()=>{
  'use strict';
  if(window.__lyChatUnitSync)return;
  const VERSION='2026.08.26.6';
  const fold=value=>String(value??'').replace(/\u2060/g,'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  const escRe=value=>String(value??'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const fmt=value=>{const n=Number(value);return Number.isInteger(n)?String(n):String(Number(n.toFixed(6)));};
  const money=(value,scale)=>{const n=Number(String(value).replace(',','.'));if(!Number.isFinite(n))return NaN;const s=fold(scale);return n*(s==='trieu'?1000000:(s==='nghin'||s==='ngan'||s==='k'?1000:1));};
  const visibleUnit=value=>{const source=String(value??'').replace(/\u2060/g,'').trim();return source.length>1?`${source.slice(0,1)}\u2060${source.slice(1)}`:source;};

  function ingredients(){
    const rows=[];
    try{if(typeof db!=='undefined'&&Array.isArray(db?.ingredients))rows.push(...db.ingredients);}catch(e){}
    try{const core=window.__lyFreshCoreV2?.store?.getState?.()?.ingredients;if(Array.isArray(core))rows.push(...core);}catch(e){}
    const unique=new Map();rows.forEach(row=>{if(row?.id)unique.set(String(row.id),row);});
    return [...unique.values()].filter(row=>row?.active!==false&&String(row?.name||'').trim());
  }

  function unitApi(){return window.__lyUnitConversions||null;}
  function canonical(value){const clean=String(value??'').replace(/\u2060/g,'');const api=unitApi();try{if(api?.canonical)return api.canonical(clean);}catch(e){}return clean.trim();}
  function ruleFor(item){
    const api=unitApi();let rule=null;try{rule=api?.ruleFor?.(item?.id)||null;}catch(e){}
    const base=canonical(rule?.baseUnit||item?.unit||'');
    const purchase=canonical(rule?.purchaseUnit||item?.purchase_unit||base);
    const ratio=Number(rule?.ratio||item?.conversion_ratio||1);
    return {base,purchase,ratio:Number.isFinite(ratio)&&ratio>0?ratio:1};
  }
  function aliasesFor(unit){
    const api=unitApi(),canonicalUnit=canonical(unit),values=new Set([canonicalUnit,String(unit||'')]);
    try{
      const def=api?.definition?.(canonicalUnit);if(def?.label)String(def.label).split(/\s*[—-]\s*/).forEach(v=>values.add(v.trim()));
      (api?.CATALOG||[]).forEach(row=>{if(canonical(row.key)===canonicalUnit){values.add(row.key);String(row.label||'').split(/\s*[—-]\s*/).forEach(v=>values.add(v.trim()));}});
    }catch(e){}
    const known={kg:['kg','ký','ky','kilo','kilogram','cân','can'],g:['g','gam','gram'],mg:['mg','miligam'],l:['l','lít','lit','liter','litre'],ml:['ml','mililít','mililit'],cl:['cl','centilít','centilit'],dl:['dl','đềxilít','dexilit','decilit'],'tấn':['tấn','tan'],cái:['cái','cai'],chiếc:['chiếc','chiec'],bộ:['bộ','bo'],đôi:['đôi','doi'],cốc:['cốc','coc'],gói:['gói','goi'],hộp:['hộp','hop'],thùng:['thùng','thung'],hũ:['hũ','hu'],lọ:['lọ','lo'],túi:['túi','tui'],khay:['khay'],vỉ:['vỉ','vi'],cuộn:['cuộn','cuon'],tờ:['tờ','to'],mét:['mét','met'],phần:['phần','phan'],suất:['suất','suat']};
    (known[canonicalUnit]||[]).forEach(v=>values.add(v));
    return [...values].map(v=>String(v||'').trim()).filter(Boolean).sort((a,b)=>b.length-a.length);
  }

  function convert(quantity,source,item){
    const api=unitApi(),rule=ruleFor(item),from=canonical(source),to=rule.base;
    if(!from||!to)return NaN;
    try{const value=api?.convert?.(quantity,from,to,item.id);if(Number.isFinite(value))return value;}catch(e){}
    if(from===rule.purchase&&to===rule.base)return Number(quantity)*rule.ratio;
    if(from===to)return Number(quantity);
    return NaN;
  }

  function normalizePurchasePricing(message,item){
    const name=String(item.name||'').trim(),rule=ruleFor(item);if(!name||!rule.purchase||rule.purchase===rule.base)return message;
    const purchaseAliases=new Set();aliasesFor(rule.purchase).forEach(v=>{purchaseAliases.add(v);purchaseAliases.add(visibleUnit(v));});
    const purchasePattern=[...purchaseAliases].map(escRe).join('|');if(!purchasePattern)return message;
    const namePattern=escRe(name).replace(/\s+/g,'\\s+'),basePattern=escRe(rule.base);
    const re=new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${purchasePattern})\\s*\\((\\d+(?:[.,]\\d+)?)\\s*${basePattern}\\)\\s*(${namePattern})\\s*(?:,|;)?\\s*(?:đơn\\s*giá|don\\s*gia|giá|gia)\\s*(\\d+(?:[.,]\\d+)?)\\s*(nghìn|nghin|ngàn|ngan|k|triệu|trieu)?`,'giu');
    return message.replace(re,(full,q,u,baseQty,n,price,scale)=>{
      const purchaseQty=Number(String(q).replace(',','.')),baseQuantity=Number(String(baseQty).replace(',','.')),purchasePrice=money(price,scale),total=purchaseQty*purchasePrice;
      if(!Number.isFinite(total)||!Number.isFinite(baseQuantity)||baseQuantity<=0)return full;
      const baseUnitCost=total/baseQuantity,priceText=`${price}${scale?` ${scale}`:''}`,shownUnit=visibleUnit(u);
      return `${q} ${shownUnit} (${baseQty} ${rule.base}) ${n} · giá mua ${priceText}/${shownUnit} · đơn giá ${fmt(baseUnitCost)} đ/${rule.base}`;
    });
  }

  function rewriteForItem(message,item){
    const name=String(item.name||'').trim(),rule=ruleFor(item);if(!name||!rule.base)return message;
    const units=new Set(),api=unitApi();
    try{(api?.listFor?.(rule.base,item.id,false)||[]).forEach(row=>aliasesFor(row.key).forEach(v=>units.add(v)));}catch(e){}
    aliasesFor(rule.purchase).forEach(v=>units.add(v));aliasesFor(rule.base).forEach(v=>units.add(v));
    if(!units.size)return message;
    const unitPattern=[...units].sort((a,b)=>b.length-a.length).map(escRe).join('|'),namePattern=escRe(name).replace(/\s+/g,'\\s+'),number='(\\d+(?:[.,]\\d+)?)';
    let out=message;
    const left=new RegExp(`${number}\\s*(${unitPattern})\\s+(${namePattern})(?=$|[\\s,;:.!?])`,'giu');
    out=out.replace(left,(full,q,u,n)=>{const quantity=Number(String(q).replace(',','.')),value=convert(quantity,u,item),source=String(u||'').trim();if(!Number.isFinite(value)||canonical(source)===rule.base)return full;return `${q} ${visibleUnit(source)} (${fmt(value)} ${rule.base}) ${n}`;});
    const right=new RegExp(`(${namePattern})\\s*(?:x|:)?\\s*${number}\\s*(${unitPattern})(?=$|[\\s,;:.!?])`,'giu');
    out=out.replace(right,(full,n,q,u)=>{const quantity=Number(String(q).replace(',','.')),value=convert(quantity,u,item),source=String(u||'').trim();if(!Number.isFinite(value)||canonical(source)===rule.base)return full;return `${n} ${q} ${visibleUnit(source)} (${fmt(value)} ${rule.base})`;});
    return normalizePurchasePricing(out,item);
  }

  function rewrite(message){
    let out=String(message??'');
    const candidates=ingredients().filter(item=>fold(out).includes(fold(item.name))).sort((a,b)=>String(b.name).length-String(a.name).length);
    candidates.forEach(item=>{out=rewriteForItem(out,item);});
    return out;
  }

  function prepareInput(){
    const input=document.getElementById('lyAssistantInput');if(!input||!input.value.trim())return;
    const next=rewrite(input.value);if(next!==input.value){input.dataset.lyOriginalUnitText=input.value;input.value=next;}
  }
  function capture(event){
    if(event.type==='click'&&event.target?.closest?.('[data-assistant-send]'))prepareInput();
    if(event.type==='keydown'&&event.target?.id==='lyAssistantInput'&&event.key==='Enter'&&!event.shiftKey)prepareInput();
  }
  function refreshHint(){const input=document.getElementById('lyAssistantInput');if(input)input.placeholder='Ví dụ: Nhập 2 hộp Bột cacao hoặc 10 kg Đường';}
  function boot(){document.addEventListener('click',capture,true);document.addEventListener('keydown',capture,true);refreshHint();new MutationObserver(refreshHint).observe(document.documentElement,{childList:true,subtree:true});}

  window.__lyChatUnitSync={version:VERSION,rewrite,refresh:refreshHint};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
