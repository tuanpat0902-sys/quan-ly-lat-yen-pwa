(()=>{
  'use strict';
  if(window.__lyChatUnitSync)return;
  const VERSION='2026.08.26.1';
  const fold=value=>String(value??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  const escRe=value=>String(value??'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const fmt=value=>{const n=Number(value);return Number.isInteger(n)?String(n):String(Number(n.toFixed(6)));};

  function ingredients(){
    const rows=[];
    try{if(typeof db!=='undefined'&&Array.isArray(db?.ingredients))rows.push(...db.ingredients);}catch(e){}
    try{const core=window.__lyFreshCoreV2?.store?.getState?.()?.ingredients;if(Array.isArray(core))rows.push(...core);}catch(e){}
    const unique=new Map();rows.forEach(row=>{if(row?.id)unique.set(String(row.id),row);});
    return [...unique.values()].filter(row=>row?.active!==false&&String(row?.name||'').trim());
  }

  function unitApi(){return window.__lyUnitConversions||null;}
  function canonical(value){const api=unitApi();try{if(api?.canonical)return api.canonical(value);}catch(e){}return String(value??'').trim();}
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

  function rewriteForItem(message,item){
    const name=String(item.name||'').trim(),rule=ruleFor(item);if(!name||!rule.base)return message;
    const units=new Set();
    const api=unitApi();
    try{(api?.listFor?.(rule.base,item.id,false)||[]).forEach(row=>aliasesFor(row.key).forEach(v=>units.add(v)));}catch(e){}
    aliasesFor(rule.purchase).forEach(v=>units.add(v));aliasesFor(rule.base).forEach(v=>units.add(v));
    if(!units.size)return message;
    const unitPattern=[...units].sort((a,b)=>b.length-a.length).map(escRe).join('|');
    const namePattern=escRe(name).replace(/\s+/g,'\\s+');
    const number='(\\d+(?:[.,]\\d+)?)';
    let out=message;
    const left=new RegExp(`${number}\\s*(${unitPattern})\\s+(${namePattern})(?=$|[\\s,;:.!?])`,'giu');
    out=out.replace(left,(full,q,u,n)=>{const value=convert(Number(String(q).replace(',','.')),u,item);return Number.isFinite(value)?`${fmt(value)} ${rule.base} ${n}`:full;});
    const right=new RegExp(`(${namePattern})\\s*(?:x|:)?\\s*${number}\\s*(${unitPattern})(?=$|[\\s,;:.!?])`,'giu');
    out=out.replace(right,(full,n,q,u)=>{const value=convert(Number(String(q).replace(',','.')),u,item);return Number.isFinite(value)?`${n} ${fmt(value)} ${rule.base}`:full;});
    return out;
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
