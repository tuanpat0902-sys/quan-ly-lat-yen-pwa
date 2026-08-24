(()=>{
'use strict';
const VERSION='2026.08.25.2';
if(window.__lyChatUnitNormalizer?.version===VERSION)return;

const text=value=>String(value??'').trim();
const normalize=value=>text(value).toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9.,:/\-\s]/g,' ').replace(/\s+/g,' ').trim();
const escapeRegex=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const numberPattern='(\\d+(?:[.,]\\d+)?|nua|mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi)';

const UNIT_DEFS={
  g:{family:'mass',factor:1,aliases:['g','gram','gam']},
  kg:{family:'mass',factor:1000,aliases:['kg','ky','ki','can','kilogram','kilogam','kilo']},
  ml:{family:'volume',factor:1,aliases:['ml','mililit','millilit','milliliter']},
  l:{family:'volume',factor:1000,aliases:['l','lit','liter','litre']},
  ly:{family:'count',factor:1,aliases:['ly','coc','cup']},
  chai:{family:'count',factor:1,aliases:['chai','bottle']},
  goi:{family:'count',factor:1,aliases:['goi','tui','bich','packet','pack']},
  hop:{family:'count',factor:1,aliases:['hop','box']},
  cai:{family:'count',factor:1,aliases:['cai','chiec']},
  phan:{family:'count',factor:1,aliases:['phan','suat']},
  dia:{family:'count',factor:1,aliases:['dia']}
};
const ALIAS_TO_UNIT=new Map();
for(const [unit,def] of Object.entries(UNIT_DEFS))for(const alias of def.aliases)ALIAS_TO_UNIT.set(normalize(alias),unit);

function canonicalUnit(value){return ALIAS_TO_UNIT.get(normalize(value))||normalize(value);}
function parsedNumber(value){const token=normalize(value),words={nua:0.5,mot:1,hai:2,ba:3,bon:4,tu:4,nam:5,sau:6,bay:7,tam:8,chin:9,muoi:10};if(token in words)return words[token];const n=Number(String(value).replace(',','.'));return Number.isFinite(n)?n:null;}
function formatQuantity(value){if(!Number.isFinite(value))return '';const rounded=Math.round(value*1e6)/1e6;return Number.isInteger(rounded)?String(rounded):String(rounded).replace('.',',');}
function convertQuantity(quantity,fromUnit,toUnit){
  const from=UNIT_DEFS[canonicalUnit(fromUnit)],to=UNIT_DEFS[canonicalUnit(toUnit)];
  if(!from||!to||from.family!==to.family)return null;
  if(from.family==='count')return quantity;
  return quantity*from.factor/to.factor;
}
function legacyDb(){try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db||{};}}
function catalog(){const data=legacyDb();return [...(data.ingredients||[]),...(data.products||[])].filter(item=>item?.id&&item?.name&&item?.active!==false);}
function products(){const warehouseId=text(window.currentWarehouseId);return (legacyDb().products||[]).filter(item=>item?.id&&item?.name&&item?.active!==false&&(!warehouseId||!item?.warehouse_id||String(item.warehouse_id)===warehouseId));}
function recognizedAliases(){return [...ALIAS_TO_UNIT.keys()].sort((a,b)=>b.length-a.length).map(escapeRegex).join('|');}
const aliasPattern=recognizedAliases();

function mappedNormalize(value){
  const raw=text(value),chars=[],map=[];let pendingSpace=false,pendingIndex=0;
  for(let index=0;index<raw.length;index++){
    let token=raw[index].toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
    token=token.replace(/[^a-z0-9.,:/\-]/g,'');
    if(!token){if(chars.length){pendingSpace=true;pendingIndex=index;}continue;}
    if(pendingSpace&&chars.at(-1)!==' '){chars.push(' ');map.push(pendingIndex);}pendingSpace=false;
    for(const ch of token){chars.push(ch);map.push(index);}
  }
  return {raw,normalized:chars.join('').trim(),map};
}
function replaceNormalizedPhrase(message,phrase,replacement){
  const mapped=mappedNormalize(message),needle=normalize(phrase),at=mapped.normalized.indexOf(needle);if(at<0)return message;
  const rawStart=mapped.map[at]??0,rawEnd=(mapped.map[at+needle.length-1]??(mapped.raw.length-1))+1;
  return `${mapped.raw.slice(0,rawStart)}${replacement}${mapped.raw.slice(rawEnd)}`.replace(/\s+/g,' ').trim();
}
function editDistance(left,right){const a=normalize(left),b=normalize(right),row=Array(b.length+1).fill(0).map((_,i)=>i);for(let i=1;i<=a.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const current=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));previous=current;}}return row[b.length];}
function saleTerm(message){
  return normalize(message)
    .replace(/\b(tao|lap|them|moi|giup|minh|toi|cho|vui long|hay)\b/g,' ')
    .replace(/\b(phieu|don|hoa don|ban hang|ban)\b/g,' ')
    .replace(/\b\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}\b/g,' ')
    .replace(new RegExp(`\\b${numberPattern}\\s*(?:${aliasPattern})?\\b`,'g'),' ')
    .replace(/\b(voi|nhe|a|so|ma)\b/g,' ').replace(/\s+/g,' ').trim();
}
function productScore(item,tokens,term){
  const name=normalize(item.name),words=name.split(' ');let score=0,matched=0;
  for(const token of tokens){let hit=0;if(words.includes(token))hit=10;else if(words.some(word=>word.startsWith(token)||token.startsWith(word)))hit=6;else if(token.length>=4&&words.some(word=>Math.abs(word.length-token.length)<=1&&editDistance(word,token)<=1))hit=4;if(hit){matched++;score+=hit;}}
  if(term&&name.includes(term))score+=20;
  if(name===term)score+=40;
  return {item,score,coverage:tokens.length?matched/tokens.length:0,name};
}
function resolveSaleProduct(message){
  const source=normalize(message);if(!/\bban\b|ban hang|phieu ban|don ban|hoa don ban/.test(source))return {message,mode:'none',candidates:[]};
  const rows=products();for(const item of rows)if(source.includes(normalize(item.name)))return {message,mode:'exact',item,candidates:[item]};
  const term=saleTerm(message),tokens=term.split(' ').filter(token=>token.length>1);if(!tokens.length)return {message,mode:'none',candidates:[]};
  const ranked=rows.map(item=>productScore(item,tokens,term)).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||b.coverage-a.coverage||a.name.localeCompare(b.name));
  if(!ranked.length)return {message,mode:'none',term,candidates:[]};
  const top=ranked[0],next=ranked[1];
  const confident=top.coverage===1&&(top.name.includes(term)||top.score-(next?.score||0)>=8);
  if(confident)return {message:replaceNormalizedPhrase(message,term,top.item.name),mode:'resolved',term,item:top.item,candidates:ranked.slice(0,4).map(row=>row.item)};
  return {message,mode:'suggest',term,candidates:ranked.filter(row=>row.coverage>0).slice(0,4).map(row=>row.item)};
}
function normalizeForItem(message,item){
  const target=canonicalUnit(item?.unit);if(!UNIT_DEFS[target])return {message,changed:false,reason:'unknown-target-unit'};
  const mapped=mappedNormalize(message),source=mapped.normalized,name=normalize(item.name),at=source.indexOf(name);if(at<0)return {message,changed:false,reason:'item-not-found'};
  const before=source.slice(0,at),after=source.slice(at+name.length);
  const left=before.match(new RegExp(`${numberPattern}\\s*(${aliasPattern})\\s*$`));
  const right=after.match(new RegExp(`^\\s*(?:x|:)?\\s*${numberPattern}\\s*(${aliasPattern})(?=\\s|$)`));
  const match=left||right;if(!match)return {message,changed:false,reason:'no-unit-near-item'};
  const quantity=parsedNumber(match[1]),spoken=canonicalUnit(match[2]);if(quantity===null)return {message,changed:false,reason:'invalid-quantity'};
  const converted=convertQuantity(quantity,spoken,target);if(converted===null)return {message,changed:false,reason:'incompatible-unit',item:item.name,spoken_unit:spoken,target_unit:target};
  const normStart=left?at-left[0].length:at,normEnd=right?at+name.length+right[0].length:at+name.length;
  const rawStart=mapped.map[Math.max(0,normStart)]??0,rawEnd=(mapped.map[Math.max(0,normEnd-1)]??(mapped.raw.length-1))+1;
  const rawNameStart=mapped.map[at]??rawStart,rawNameEnd=(mapped.map[at+name.length-1]??(rawEnd-1))+1,rawName=mapped.raw.slice(rawNameStart,rawNameEnd).trim()||item.name;
  const phrase=`${formatQuantity(converted)} ${target} ${rawName}`;
  return {message:`${mapped.raw.slice(0,rawStart)}${phrase}${mapped.raw.slice(rawEnd)}`.replace(/\s+/g,' ').trim(),changed:true,item:item.name,spoken_unit:spoken,target_unit:target,original_quantity:quantity,converted_quantity:converted};
}
function normalizeCommand(message){
  const sale=resolveSaleProduct(message);let current=sale.message,changed=current!==text(message);const conversions=[],issues=[];
  for(const row of catalog().map(item=>({item,name:normalize(item.name)})).sort((a,b)=>b.name.length-a.name.length)){
    if(!normalize(current).includes(row.name))continue;
    const result=normalizeForItem(current,row.item);
    if(result.changed){current=result.message;changed=true;conversions.push(result);}
    else if(result.reason==='incompatible-unit')issues.push(result);
  }
  return {message:current,changed,conversions,issues,sale};
}
function issueMessage(issue){return `Đơn vị “${issue.spoken_unit}” không phù hợp với ${issue.item} đang quản lý theo “${issue.target_unit}”. Hãy dùng đơn vị tương thích để tránh tạo sai số lượng.`;}
function suggestionCommand(original,item,term){return replaceNormalizedPhrase(original,term,item.name);}
function showSaleSuggestions(input,sale){
  const holder=document.getElementById?.('lyAssistantMessages');if(!holder||!sale?.candidates?.length)return false;
  holder.querySelector?.('[data-ly-sale-suggestion="1"]')?.remove();
  const card=document.createElement('div');card.className='ly-assistant-message is-assistant';card.dataset.lySaleSuggestion='1';
  card.innerHTML=`<div>Mình chưa thấy tên món chính xác “${text(sale.term)}”. Bạn muốn món nào dưới đây?</div><div class="ly-assistant-choice"><b>Gợi ý theo tên món</b><div>${sale.candidates.map((item,index)=>`<button type="button" data-ly-product-choice="${index}">${text(item.name)}</button>`).join('')}</div></div>`;
  card.addEventListener('click',event=>{const button=event.target?.closest?.('[data-ly-product-choice]');if(!button)return;const item=sale.candidates[Number(button.dataset.lyProductChoice)];if(!item)return;input.value=suggestionCommand(input.dataset.lyOriginalSaleCommand||input.value,item,sale.term);card.remove();document.querySelector?.('#lyAssistantDrawer [data-assistant-send]')?.click();});
  input.dataset.lyOriginalSaleCommand=input.value;holder.appendChild(card);holder.scrollTop=holder.scrollHeight;return true;
}
function install(){
  const drawer=document.getElementById?.('lyAssistantDrawer');if(!drawer||drawer.dataset.unitNormalizer==='2')return false;
  drawer.dataset.unitNormalizer='2';
  const rewrite=()=>{
    const input=document.getElementById?.('lyAssistantInput');if(!input?.value)return {ok:true};
    const result=normalizeCommand(input.value);
    if(result.sale?.mode==='suggest'&&result.sale.candidates.length){showSaleSuggestions(input,result.sale);return {ok:false,silent:true,result};}
    if(result.issues.length)return {ok:false,message:issueMessage(result.issues[0]),result};
    if(result.changed){input.dataset.originalCommand=input.value;input.value=result.message;input.dataset.unitNormalized='1';}
    return {ok:true,result};
  };
  const block=(event,result)=>{if(result?.ok!==false)return false;event.preventDefault?.();event.stopImmediatePropagation?.();if(!result.silent){try{if(typeof window.toastMsg==='function')window.toastMsg(result.message);else alert(result.message);}catch(_){alert(result.message);}}return true;};
  drawer.addEventListener('click',event=>{if(event.target?.closest?.('[data-assistant-send]'))block(event,rewrite());},true);
  drawer.querySelector?.('#lyAssistantInput')?.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey)block(event,rewrite());},true);
  return true;
}
function boot(attempt=0){if(install())return;if(attempt<40)setTimeout(()=>boot(attempt+1),100);}
window.__lyChatUnitNormalizer={version:VERSION,canonicalUnit,convertQuantity,resolveSaleProduct,normalizeCommand,install,status:()=>({version:VERSION,installed:document.getElementById?.('lyAssistantDrawer')?.dataset?.unitNormalizer==='2'})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot(),{once:true});else boot();
})();
