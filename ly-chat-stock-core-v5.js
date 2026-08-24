(()=>{
'use strict';
const VERSION='2026.08.25.5';
if(window.__lyChatStockCoreV5?.version===VERSION)return;
const text=v=>String(v??'').trim();
const vi=v=>text(v).normalize('NFC').toLocaleLowerCase('vi').replace(/[^\p{L}\p{M}0-9.,:/\-\s]/gu,' ').replace(/\s+/g,' ').trim();
const fold=v=>vi(v).normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
const NUM='(\\d+(?:[.,]\\d+)?|nửa|một|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|nua|mot|bon|tu|nam|sau|bay|tam|chin|muoi)';
const UNIT='(kg|ký|kí|ky|ki|cân|can|kilogram|kilo|g|gram|gam|ml|l|lít|lit|liter)?';
const amountRe=new RegExp(`\\b${NUM}\\s*${UNIT}\\b`,'iu');
const aliases={gram:'g',gam:'g','ký':'kg','kí':'kg',ky:'kg',ki:'kg','cân':'kg',can:'kg',kilogram:'kg',kilo:'kg','lít':'l',lit:'l',liter:'l'};
const defs={g:['mass',1],kg:['mass',1000],ml:['volume',1],l:['volume',1000]};
const words={'nửa':.5,nua:.5,'một':1,mot:1,hai:2,ba:3,'bốn':4,bon:4,'tư':4,tu:4,'năm':5,nam:5,'sáu':6,sau:6,'bảy':7,bay:7,'tám':8,tam:8,'chín':9,chin:9,'mười':10,muoi:10};
const context={op:'',at:0};
const CONTEXT_MS=3*60*1000;
const canonical=u=>aliases[vi(u)]||aliases[fold(u)]||fold(u);
const numberValue=v=>{const t=vi(v);if(t in words)return words[t];const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null;};
const fmt=v=>{const n=Math.round(Number(v)*1e6)/1e6;return Number.isInteger(n)?String(n):String(n).replace('.',',');};
function dbx(){try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db||{};}}
function ingredients(){const wid=text(window.currentWarehouseId);return (dbx().ingredients||[]).filter(x=>x?.id&&x?.name&&x?.active!==false&&(x.ingredient_type||'purchased')==='purchased'&&(!wid||!x?.warehouse_id||String(x.warehouse_id)===wid));}
function explicitOperation(message){const s=fold(message);if(/(^|\s)(nhap|nhap kho|nhap hang)(\s|$)/.test(s))return 'Nhập';if(/(^|\s)(xuat|xuat kho|xuat hang)(\s|$)/.test(s))return 'Xuất';if(/kiem ke|kiem kho|phieu kiem/.test(s))return 'Kiểm kê';return '';}
function remember(op){if(op){context.op=op;context.at=Date.now();}}
function amountOf(message){const m=vi(message).match(amountRe);return m?{quantity:numberValue(m[1]),unit:canonical(m[2]||''),raw:m[0]}:null;}
function requestedTerm(message){return vi(message)
 .replace(/\b(tạo|tao|lập|lap|thêm|them|mới|moi|giúp|giup|mình|minh|tôi|toi|cho|vui lòng|vui long|hãy|hay)\b/gu,' ')
 .replace(/\b(phiếu|phieu|nhập kho|nhap kho|nhập hàng|nhap hang|nhập|nhap|xuất kho|xuat kho|xuất hàng|xuat hang|xuất|xuat|kiểm kê|kiem ke|kiểm kho|kiem kho|kiểm|kiem)\b/gu,' ')
 .replace(amountRe,' ').replace(/\b(với|voi|nhé|nhe|ạ|a)\b/gu,' ').replace(/\s+/g,' ').trim();}
function operation(message){const explicit=explicitOperation(message);if(explicit){remember(explicit);return explicit;}const amount=amountOf(message),term=requestedTerm(message);if(amount&&term&&context.op&&Date.now()-context.at<=CONTEXT_MS)return context.op;return '';}
function editDistance(a,b){a=fold(a);b=fold(b);const r=Array(b.length+1).fill(0).map((_,i)=>i);for(let i=1;i<=a.length;i++){let p=r[0];r[0]=i;for(let j=1;j<=b.length;j++){const c=r[j];r[j]=Math.min(r[j]+1,r[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=c;}}return r[b.length];}
function resolve(term){const rows=ingredients(),needleVi=vi(term),needle=fold(term);if(!needle)return {mode:'none',partial:[]};const exact=rows.find(x=>vi(x.name)===needleVi);if(exact)return {mode:'exact',item:exact};const viTokens=needleVi.split(' ').filter(Boolean);if(viTokens.length===1){const first=rows.filter(x=>vi(x.name).split(' ')[0]===needleVi);if(first.length===1)return {mode:'alias',item:first[0]};if(first.length>1)return {mode:'ambiguous',partial:first};}const foldedExact=rows.find(x=>fold(x.name)===needle);if(foldedExact)return {mode:'folded',item:foldedExact};const tokens=needle.split(' ').filter(Boolean);if(tokens.length===1){const first=rows.filter(x=>fold(x.name).split(' ')[0]===needle);if(first.length===1)return {mode:'folded-alias',item:first[0]};if(first.length>1)return {mode:'ambiguous',partial:first};}const typo=rows.map(item=>({item,d:editDistance(item.name,term)})).filter(x=>x.d<=Math.min(2,Math.max(1,Math.floor(needle.length/8)))).sort((a,b)=>a.d-b.d);if(typo.length===1)return {mode:'typo',item:typo[0].item};const partial=rows.filter(x=>fold(x.name).split(' ').includes(needle)||fold(x.name).includes(needle));return {mode:'missing',partial};}
function convertAmount(amount,item){const target=canonical(item?.unit);if(!amount||amount.quantity===null)return {ok:true,quantity:null,unit:target};if(!amount.unit)return {ok:true,quantity:amount.quantity,unit:target||''};const from=defs[amount.unit],to=defs[target];if(!from||!to||from[0]!==to[0])return {ok:false,quantity:amount.quantity,unit:target};return {ok:true,quantity:amount.quantity*from[1]/to[1],unit:target};}
function preprocess(message){const raw=text(message),op=operation(raw);if(!op)return {mode:'pass',message:raw};const amount=amountOf(raw),term=requestedTerm(raw);if(!term)return {mode:'pass',message:raw};const resolved=resolve(term);if(resolved.mode==='ambiguous'){remember(op);const prefix=explicitOperation(raw)?'':`${op} `;return {mode:'ambiguous',message:`${prefix}${raw}`.trim(),term,amount,candidates:resolved.partial||[]};}if(resolved.mode==='missing'||resolved.mode==='none'){remember(op);return {mode:'missing',message:raw,term,amount,candidates:resolved.partial||[]};}const item=resolved.item,converted=convertAmount(amount,item);if(!converted.ok)return {mode:'invalid-unit',message:raw,term,amount,item};const rewritten=`${op} ${converted.quantity==null?'':`${fmt(converted.quantity)}${converted.unit?` ${converted.unit}`:''} `}${item.name}`.replace(/\s+/g,' ').trim();remember(op);return {mode:'resolved',message:rewritten,term,amount,item,converted};}
window.__lyChatStockCoreV5={version:VERSION,vi,fold,amountOf,requestedTerm,operation,resolve,convertAmount,preprocess,status:()=>({version:VERSION,context:{...context}})};
})();
