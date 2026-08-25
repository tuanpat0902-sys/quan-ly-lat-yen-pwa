(()=>{
'use strict';
const VERSION='2026.08.25.5';
if(window.__lyChatStockCommandNormalizerV4?.version===VERSION)return;
const text=v=>String(v??'').trim();
const vi=v=>text(v).normalize('NFC').toLocaleLowerCase('vi').replace(/[^\p{L}\p{M}0-9.,:/\-\s]/gu,' ').replace(/\s+/g,' ').trim();
const fold=v=>vi(v).normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NUM='(\\d+(?:[.,]\\d+)?|nửa|một|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|nua|mot|bon|tu|nam|sau|bay|tam|chin|muoi)';
const UNIT='(tấn|tan|kg|ký|kí|ky|ki|cân|can|kilogram|kilo|mg|g|gram|gam|ml|cl|dl|l|lít|lit|liter|cái|chiếc|bộ|đôi|ly|cốc|chai|lon|hũ|lọ|gói|túi|hộp|thùng|bao|khay|vỉ|cuộn|tờ|mét|phần|suất)?';
const amountRe=new RegExp(`\\b${NUM}\\s*${UNIT}\\b`,'iu');
const aliases={gram:'g',gam:'g','ký':'kg','kí':'kg',ky:'kg',ki:'kg','cân':'kg',can:'kg',kilogram:'kg',kilo:'kg','lít':'l',lit:'l',liter:'l'};
const defs={mg:['mass',.001],g:['mass',1],kg:['mass',1000],'tấn':['mass',1000000],ml:['volume',1],cl:['volume',10],dl:['volume',100],l:['volume',1000]};
const context={op:'',at:0};
const CONTEXT_MS=3*60*1000;
const canonical=u=>window.__lyUnitConversions?.canonical?.(u)||aliases[vi(u)]||aliases[fold(u)]||fold(u);
const numberValue=v=>{const t=vi(v),w={'nửa':.5,nua:.5,'một':1,mot:1,hai:2,ba:3,'bốn':4,bon:4,'tư':4,tu:4,'năm':5,nam:5,'sáu':6,sau:6,'bảy':7,bay:7,'tám':8,tam:8,'chín':9,chin:9,'mười':10,muoi:10};if(t in w)return w[t];const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null;};
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
function contextualOperation(message){const explicit=explicitOperation(message);if(explicit){remember(explicit);return explicit;}const amount=amountOf(message),term=requestedTerm(message);if(amount&&term&&context.op&&Date.now()-context.at<=CONTEXT_MS)return context.op;return '';}
function editDistance(a,b){a=fold(a);b=fold(b);const r=Array(b.length+1).fill(0).map((_,i)=>i);for(let i=1;i<=a.length;i++){let p=r[0];r[0]=i;for(let j=1;j<=b.length;j++){const c=r[j];r[j]=Math.min(r[j]+1,r[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=c;}}return r[b.length];}
function resolve(term){const rows=ingredients(),needleVi=vi(term),needle=fold(term);if(!needle)return {mode:'none',partial:[]};
 const exact=rows.find(x=>vi(x.name)===needleVi);if(exact)return {mode:'exact',item:exact};
 const viTokens=needleVi.split(' ').filter(Boolean);if(viTokens.length===1){const first=rows.filter(x=>vi(x.name).split(' ')[0]===needleVi);if(first.length===1)return {mode:'alias',item:first[0]};if(first.length>1)return {mode:'ambiguous',partial:first};}
 const foldedExact=rows.find(x=>fold(x.name)===needle);if(foldedExact)return {mode:'folded',item:foldedExact};
 const tokens=needle.split(' ').filter(Boolean);if(tokens.length===1){const first=rows.filter(x=>fold(x.name).split(' ')[0]===needle);if(first.length===1)return {mode:'folded-alias',item:first[0]};if(first.length>1)return {mode:'ambiguous',partial:first};}
 const typo=rows.map(item=>({item,d:editDistance(item.name,term)})).filter(x=>x.d<=Math.min(2,Math.max(1,Math.floor(needle.length/8)))).sort((a,b)=>a.d-b.d);if(typo.length===1)return {mode:'typo',item:typo[0].item};
 const partial=rows.filter(x=>fold(x.name).split(' ').includes(needle)||fold(x.name).includes(needle));return {mode:'missing',partial};}
function convert(amount,item){const target=canonical(item?.unit);if(!amount||amount.quantity===null)return {ok:true,quantity:null,unit:target};if(!amount.unit)return {ok:true,quantity:amount.quantity,unit:target||''};const shared=window.__lyUnitConversions?.convert?.(amount.quantity,amount.unit,target,item?.id||'');if(Number.isFinite(shared))return {ok:true,quantity:shared,unit:target};const from=defs[amount.unit],to=defs[target];if(!from||!to||from[0]!==to[0])return {ok:false};return {ok:true,quantity:amount.quantity*from[1]/to[1],unit:target};}
function clearCards(){document.querySelectorAll?.('[data-ly-stock-safety="1"],[data-ly-stock-v4="1"]').forEach(n=>n.remove());}
function show(html){const holder=document.getElementById?.('lyAssistantMessages');if(!holder)return;clearCards();const card=document.createElement('div');card.className='ly-assistant-message is-assistant';card.dataset.lyStockV4='1';card.innerHTML=html;holder.appendChild(card);holder.scrollTop=holder.scrollHeight;}
function rewrite(input,op,item,converted){input.dataset.originalCommand=input.value;input.value=`${op} ${converted.quantity==null?'':`${fmt(converted.quantity)}${converted.unit?` ${converted.unit}`:''} `}${item.name}`.replace(/\s+/g,' ').trim();remember(op);}
function process(input){const op=contextualOperation(input.value);if(!op)return {allow:true};const amount=amountOf(input.value),term=requestedTerm(input.value),resolved=resolve(term);
 if(['exact','alias','folded','folded-alias','typo'].includes(resolved.mode)){const converted=convert(amount,resolved.item);if(!converted.ok){show(`<div>Đơn vị <b>${esc(amount?.unit||'')}</b> không tương thích với <b>${esc(resolved.item.name)}</b> (${esc(resolved.item.unit||'')}). Mình chưa tạo phiếu để tránh sai số lượng.</div>`);return {allow:false};}rewrite(input,op,resolved.item,converted);return {allow:true};}
 if(resolved.mode==='ambiguous'){remember(op);const rows=(resolved.partial||[]).filter(item=>{if(!amount?.unit)return true;const a=defs[amount.unit],b=defs[canonical(item.unit)];return !!a&&!!b&&a[0]===b[0];});show(`<div>Mình hiểu bạn đang nói <b>“${esc(term)}”</b>${amount?.quantity!=null?` với số lượng <b>${esc(fmt(amount.quantity))} ${esc(amount.unit||'')}</b>`:''}, nhưng có nhiều nguyên liệu phù hợp. Bạn nói rõ tên nhé.</div><div style="margin-top:8px">${rows.slice(0,5).map(x=>`<b>${esc(x.name)} (${esc(x.unit||'')})</b>`).join(', ')}</div>`);return {allow:false};}
 if(resolved.mode==='missing'){remember(op);const rows=(resolved.partial||[]).filter(item=>{if(!amount?.unit)return true;const a=defs[amount.unit],b=defs[canonical(item.unit)];return !!a&&!!b&&a[0]===b[0];});show(`<div>Mình không tìm thấy nguyên liệu chính xác <b>“${esc(term)}”</b> trong kho đang chọn. Mình chưa tạo phiếu để tránh chọn nhầm.${rows.length?`<div style="margin-top:8px">Tên gần nhất cùng loại đơn vị: ${rows.slice(0,4).map(x=>`<b>${esc(x.name)} (${esc(x.unit||'')})</b>`).join(', ')}.</div>`:''}</div>`);return {allow:false};}
 return {allow:true};}
function install(){const drawer=document.getElementById?.('lyAssistantDrawer');if(!drawer||drawer.dataset.stockCommandNormalizerV4==='1')return false;drawer.dataset.stockCommandNormalizerV4='1';drawer.dataset.stockCommandNormalizer='4';const handler=e=>{const send=e.target?.closest?.('[data-assistant-send]'),enter=e.type==='keydown'&&e.key==='Enter'&&!e.shiftKey;if(!send&&!enter)return;const input=document.getElementById?.('lyAssistantInput');if(!input?.value)return;const r=process(input);if(r.allow)return;e.preventDefault?.();e.stopImmediatePropagation?.();};drawer.addEventListener('click',handler,true);drawer.querySelector?.('#lyAssistantInput')?.addEventListener('keydown',handler,true);return true;}
function boot(i=0){if(install())return;if(i<50)setTimeout(()=>boot(i+1),100);}
window.__lyChatStockCommandNormalizerV4={version:VERSION,vi,fold,requestedTerm,resolve,convert,process,install,status:()=>({version:VERSION,installed:document.getElementById?.('lyAssistantDrawer')?.dataset?.stockCommandNormalizerV4==='1',context:{...context}})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot(),{once:true});else boot();
})();
