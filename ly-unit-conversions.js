/* Lát Yên — shared measurement units and ingredient purchase conversions. */
(()=>{
  'use strict';
  if(window.__lyUnitConversions)return;
  const VERSION='2026.08.25.3';
  const STORAGE_KEY='__latyen_ingredient_unit_conversions_v1';
  const CATALOG=[
    {key:'mg',label:'mg — miligam',family:'mass',factor:.001},
    {key:'g',label:'g — gam',family:'mass',factor:1},
    {key:'kg',label:'kg — kilôgam',family:'mass',factor:1000},
    {key:'tấn',label:'tấn',family:'mass',factor:1000000},
    {key:'ml',label:'ml — mililít',family:'volume',factor:1},
    {key:'cl',label:'cl — centilít',family:'volume',factor:10},
    {key:'dl',label:'dl — đềxilít',family:'volume',factor:100},
    {key:'l',label:'l — lít',family:'volume',factor:1000},
    ...['cái','chiếc','bộ','đôi','ly','cốc','chai','lon','hũ','lọ','gói','túi','hộp','thùng','bao','khay','vỉ','cuộn','tờ','mét','phần','suất'].map(key=>({key,label:key,family:'count',factor:1}))
  ];
  const byKey=new Map(CATALOG.map(item=>[item.key,item]));
  const fold=value=>String(value??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  const aliases={gram:'g',gam:'g',kilogram:'kg',kilo:'kg',ky:'kg',ki:'kg',can:'kg',tan:'tấn',mililit:'ml',milliliter:'ml',centilit:'cl',decilit:'dl',lit:'l',liter:'l',cai:'cái',chiec:'chiếc',bo:'bộ',doi:'đôi',coc:'cốc',chai:'chai',lon:'lon',hu:'hũ',lo:'lọ',goi:'gói',tui:'túi',hop:'hộp',thung:'thùng',bao:'bao',khay:'khay',vi:'vỉ',cuon:'cuộn',to:'tờ',met:'mét',phan:'phần',suat:'suất'};
  const canonical=value=>{const raw=String(value??'').trim();if(byKey.has(raw))return raw;const normalized=fold(raw);return aliases[normalized]||CATALOG.find(item=>fold(item.key)===normalized)?.key||raw;};
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const readRules=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch(error){return {}}};
  const cloudCache=new Map();
  const remember=row=>{if(row?.id)cloudCache.set(String(row.id),row);return row||null;};
  const cloudIngredientFor=ingredientId=>{
    const id=String(ingredientId||'');if(!id)return null;
    if(cloudCache.has(id))return cloudCache.get(id);
    try{if(typeof db!=='undefined'&&Array.isArray(db?.ingredients)){const found=db.ingredients.find(item=>String(item?.id||'')===id);if(found)return remember(found);}}catch(e){}
    try{const rows=window.__lyFreshCoreV2?.store?.getState?.()?.ingredients;if(Array.isArray(rows)){const found=rows.find(item=>String(item?.id||'')===id);if(found)return remember(found);}}catch(e){}
    return null;
  };
  const ruleFor=ingredientId=>{
    const cloud=cloudIngredientFor(ingredientId),purchaseUnit=canonical(cloud?.purchase_unit||''),baseUnit=canonical(cloud?.unit||''),ratio=Number(cloud?.conversion_ratio);
    if(baseUnit&&purchaseUnit&&Number.isFinite(ratio)&&ratio>0)return {baseUnit,purchaseUnit,ratio,updatedAt:cloud?.updated_at||null,source:'cloud'};
    return readRules()[String(ingredientId||'')]||null;
  };
  const saveIngredientRule=(ingredientId,input={})=>{const id=String(ingredientId||'');if(!id)return null;const rules=readRules(),baseUnit=canonical(input.baseUnit||''),purchaseUnit=canonical(input.purchaseUnit||baseUnit),ratio=Number(input.ratio||1);if(!baseUnit||!purchaseUnit||!Number.isFinite(ratio)||ratio<=0)throw new Error('Tỷ lệ quy đổi phải lớn hơn 0');rules[id]={baseUnit,purchaseUnit,ratio,updatedAt:new Date().toISOString()};localStorage.setItem(STORAGE_KEY,JSON.stringify(rules));return rules[id];};
  const removeIngredientRule=ingredientId=>{const rules=readRules(),id=String(ingredientId||'');if(Object.prototype.hasOwnProperty.call(rules,id)){delete rules[id];localStorage.setItem(STORAGE_KEY,JSON.stringify(rules));}cloudCache.delete(id);};
  const definition=unit=>byKey.get(canonical(unit))||null;
  const compatible=(from,to,ingredientId='')=>{const a=canonical(from),b=canonical(to);if(a===b)return true;const da=definition(a),db=definition(b);if(da&&db&&da.family===db.family&&da.family!=='count')return true;const rule=ruleFor(ingredientId);return !!rule&&((a===rule.purchaseUnit&&b===rule.baseUnit)||(a===rule.baseUnit&&b===rule.purchaseUnit));};
  const convert=(quantity,from,to,ingredientId='')=>{const value=Number(quantity),a=canonical(from),b=canonical(to);if(!Number.isFinite(value))return NaN;if(a===b)return value;const da=definition(a),db=definition(b);if(da&&db&&da.family===db.family&&da.family!=='count')return value*da.factor/db.factor;const rule=ruleFor(ingredientId);if(rule&&a===rule.purchaseUnit&&b===rule.baseUnit)return value*Number(rule.ratio||1);if(rule&&a===rule.baseUnit&&b===rule.purchaseUnit)return value/Number(rule.ratio||1);return NaN;};
  const listFor=(baseUnit='',ingredientId='',includeAll=false)=>{const base=canonical(baseUnit),baseDef=definition(base),rule=ruleFor(ingredientId);let rows=includeAll?CATALOG.slice():CATALOG.filter(item=>item.key===base||(baseDef&&baseDef.family!=='count'&&item.family===baseDef.family));if(rule?.purchaseUnit&&!rows.some(item=>item.key===rule.purchaseUnit))rows.push(definition(rule.purchaseUnit)||{key:rule.purchaseUnit,label:rule.purchaseUnit,family:'custom',factor:1});if(base&&!includeAll&&!rows.some(item=>item.key===base))rows.unshift({key:base,label:base,family:'custom',factor:1});return rows;};
  const optionsHtml=(current='',options={})=>{const selected=canonical(current),known=!!definition(selected),rows=listFor(options.baseUnit||(known?selected:'g'),options.ingredientId||'',options.includeAll!==false);return rows.map(item=>`<option value="${escapeHtml(item.key)}" ${item.key===selected?'selected':''}>${escapeHtml(item.label)}</option>`).join('')+(options.allowOther===false?'':`<option value="khác" ${selected&&!rows.some(item=>item.key===selected)?'selected':''}>Khác…</option>`);};
  const ingredientOptionsHtml=(ingredient,current='')=>{const base=canonical(ingredient?.unit||''),selected=canonical(current||base);return listFor(base,ingredient?.id||'',false).map(item=>`<option value="${escapeHtml(item.key)}" ${item.key===selected?'selected':''}>${escapeHtml(item.label)}</option>`).join('');};
  const applyIngredientOptions=(select,ingredient,current='')=>{if(!select)return false;const base=canonical(ingredient?.unit||''),selected=canonical(current||base),rows=listFor(base,ingredient?.id||'',false);while(select.options?.length)select.remove(0);rows.forEach(item=>{const option=select.ownerDocument.createElement('option');option.value=item.key;option.textContent=item.label;option.selected=item.key===selected;select.add(option);});return true;};
  const updateIngredientFormHint=()=>{const get=id=>document.getElementById(id),baseSelect=get('igUnit');const base=baseSelect?.value==='khác'?String(get('igUnitOther')?.value||'').trim():baseSelect?.value,purchase=get('igPurchaseUnit')?.value||base,ratioInput=get('igConversionRatio'),baseDef=definition(base),purchaseDef=definition(purchase),standard=base===purchase||(baseDef&&purchaseDef&&baseDef.family===purchaseDef.family&&baseDef.family!=='count');if(ratioInput){ratioInput.readOnly=!!standard;if(standard){const automatic=base===purchase?1:convert(1,purchase,base);if(Number.isFinite(automatic))ratioInput.value=String(automatic);}}const ratio=Number(ratioInput?.value||1),hint=get('igConversionHint'),valid=!!(base&&purchase&&ratio>0);if(hint){hint.textContent=valid?`${standard?'Quy đổi chuẩn tự động':'Quy đổi đóng gói'}: 1 ${purchase} = ${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:6}).format(ratio)} ${base}. Tồn kho và giá vốn được lưu theo ${base}.`:'Vui lòng nhập tỷ lệ quy đổi lớn hơn 0.';hint.classList.toggle('neg',!valid);}};

  async function fetchCloudIngredient(id){
    const existing=cloudIngredientFor(id);
    if(existing?.purchase_unit&&Number(existing?.conversion_ratio)>0)return existing;
    try{
      const client=(()=>{try{if(typeof sb!=='undefined'&&sb)return sb;}catch(e){}return window.sb||null;})();
      if(!client?.from)return existing;
      const q=await client.from('ly_ingredients').select('id,name,unit,purchase_unit,conversion_ratio,updated_at').eq('id',id).maybeSingle();
      if(!q?.error&&q?.data)return remember(q.data);
    }catch(e){}
    return existing;
  }
  const formatNumber=value=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:6}).format(Number(value||0));
  const packagingText=ingredient=>{
    if(!ingredient)return '—';
    const rule=ruleFor(ingredient.id),base=canonical(rule?.baseUnit||ingredient.unit||''),purchase=canonical(rule?.purchaseUnit||ingredient.purchase_unit||base),ratio=Number(rule?.ratio||ingredient.conversion_ratio||1);
    if(!purchase)return '—';
    return Number.isFinite(ratio)&&ratio>0?`${purchase} · 1 ${purchase} = ${formatNumber(ratio)} ${base}`:purchase;
  };
  function ingredientRows(){
    const rows=[];
    try{if(typeof db!=='undefined'&&Array.isArray(db?.ingredients))rows.push(...db.ingredients);}catch(e){}
    try{const v2=window.__lyFreshCoreV2?.store?.getState?.()?.ingredients;if(Array.isArray(v2))rows.push(...v2);}catch(e){}
    cloudCache.forEach(row=>rows.push(row));
    const unique=new Map();rows.forEach(row=>{if(row?.id)unique.set(String(row.id),row);});return [...unique.values()];
  }
  function enhanceIngredientTables(){
    const ingredients=ingredientRows();
    document.querySelectorAll('table.ingredient-stock-table:not(.prepared-virtual-table)').forEach(table=>{
      const header=table.rows?.[0];if(!header)return;
      const headers=[...header.cells].map(cell=>String(cell.textContent||'').trim());
      const unitIndex=headers.indexOf('Đơn vị'),supplierIndex=headers.indexOf('Nhà cung cấp gần nhất');
      if(unitIndex<0||supplierIndex<0)return;
      if(!header.querySelector('[data-ly-purchase-column]')){const th=document.createElement('th');th.textContent='Đơn vị mua/đóng gói';th.dataset.lyPurchaseColumn='1';header.cells[unitIndex].after(th);}
      [...table.rows].slice(1).forEach(row=>{
        if(row.querySelector('[data-ly-purchase-cell]'))return;
        const name=String(row.cells?.[1]?.textContent||'').trim();
        const ingredient=ingredients.find(item=>fold(item?.name)===fold(name));
        const td=document.createElement('td');td.dataset.lyPurchaseCell='1';td.textContent=ingredient?packagingText(ingredient):'—';td.style.whiteSpace='nowrap';
        row.cells?.[unitIndex]?.after(td);
      });
    });
  }
  async function hydrateEditForm(){
    const purchase=document.getElementById('igPurchaseUnit'),ratio=document.getElementById('igConversionRatio');if(!purchase||!ratio)return;
    const panel=purchase.closest('[data-edit-id]'),id=String(panel?.dataset?.editId||'');if(!id||panel?.dataset?.lyConversionHydrated===id)return;
    const ingredient=await fetchCloudIngredient(id),rule=(ingredient&&ruleFor(id))||null;if(!rule)return;
    const baseSelect=document.getElementById('igUnit'),base=canonical(rule.baseUnit||ingredient?.unit||''),purchaseUnit=canonical(rule.purchaseUnit||ingredient?.purchase_unit||base);
    if(baseSelect&&base){const known=[...baseSelect.options].some(o=>o.value===base);if(known)baseSelect.value=base;else{baseSelect.value='khác';const other=document.getElementById('igUnitOther');if(other){other.value=base;other.style.display='';}}}
    if(purchaseUnit){if(![...purchase.options].some(o=>o.value===purchaseUnit)){const opt=document.createElement('option');opt.value=purchaseUnit;opt.textContent=definition(purchaseUnit)?.label||purchaseUnit;purchase.add(opt);}purchase.value=purchaseUnit;}
    if(Number(rule.ratio)>0)ratio.value=String(rule.ratio);
    panel.dataset.lyConversionHydrated=id;updateIngredientFormHint();
  }
  let refreshTimer=0;
  function scheduleUiRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{enhanceIngredientTables();hydrateEditForm();},40);}
  function bootUiEnhancements(){
    scheduleUiRefresh();
    const observer=new MutationObserver(scheduleUiRefresh);observer.observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('latyen:v2-ingredient-saved',()=>{cloudCache.clear();setTimeout(scheduleUiRefresh,60);});
  }

  window.__lyUnitConversions={VERSION,STORAGE_KEY,CATALOG,canonical,definition,compatible,convert,ruleFor,saveIngredientRule,removeIngredientRule,listFor,optionsHtml,ingredientOptionsHtml,applyIngredientOptions,updateIngredientFormHint,enhanceIngredientTables,hydrateEditForm};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootUiEnhancements,{once:true});else bootUiEnhancements();
})();
