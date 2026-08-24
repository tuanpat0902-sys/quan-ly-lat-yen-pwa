(()=>{
'use strict';
const VERSION='2026.08.25.1';
if(window.__lyChatStockCommandNormalizer?.version===VERSION)return;
const text=v=>String(v??'').trim();
const norm=v=>text(v).toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9.,:/\-\s]/g,' ').replace(/\s+/g,' ').trim();
const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NUM='(\\d+(?:[.,]\\d+)?|nua|mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi)';
const UNIT='(kg|ky|ki|can|kilogram|kilo|g|gram|gam|ml|l|lit|liter)?';
const amountRe=new RegExp(`\\b${NUM}\\s*${UNIT}\\b`,'i');
const aliases={gram:'g',gam:'g',ky:'kg',ki:'kg',can:'kg',kilogram:'kg',kilo:'kg',lit:'l',liter:'l'};
const defs={g:['mass',1],kg:['mass',1000],ml:['volume',1],l:['volume',1000]};
const canonical=u=>aliases[norm(u)]||norm(u);
const numberValue=v=>{const t=norm(v),w={nua:.5,mot:1,hai:2,ba:3,bon:4,tu:4,nam:5,sau:6,bay:7,tam:8,chin:9,muoi:10};if(t in w)return w[t];const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null;};
const fmt=v=>{const n=Math.round(Number(v)*1e6)/1e6;return Number.isInteger(n)?String(n):String(n).replace('.',',');};
function dbx(){try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db||{};}}
function ingredients(){const wid=text(window.currentWarehouseId);return (dbx().ingredients||[]).filter(x=>x?.id&&x?.name&&x?.active!==false&&(x.ingredient_type||'purchased')==='purchased'&&(!wid||!x?.warehouse_id||String(x.warehouse_id)===wid));}
function editDistance(a,b){a=norm(a);b=norm(b);const r=Array(b.length+1).fill(0).map((_,i)=>i);for(let i=1;i<=a.length;i++){let p=r[0];r[0]=i;for(let j=1;j<=b.length;j++){const c=r[j];r[j]=Math.min(r[j]+1,r[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=c;}}return r[b.length];}
function operation(source){if(/(^|\s)(nhap|nhap kho|nhap hang)(\s|$)/.test(source))return 'Nhập';if(/(^|\s)(xuat|xuat kho|xuat hang)(\s|$)/.test(source))return 'Xuất';if(/kiem ke|kiem kho|phieu kiem/.test(source))return 'Kiểm kê';return '';}
function amountOf(message){const m=norm(message).match(amountRe);return m?{quantity:numberValue(m[1]),unit:canonical(m[2]||''),raw:m[0]}:null;}
function requestedTerm(message){return norm(message)
 .replace(/\b(tao|lap|them|moi|giup|minh|toi|cho|vui long|hay)\b/g,' ')
 .replace(/\b(phieu|nhap kho|nhap hang|nhap|xuat kho|xuat hang|xuat|kiem ke|kiem kho|kiem)\b/g,' ')
 .replace(amountRe,' ').replace(/\b(voi|nhe|a)\b/g,' ').replace(/\s+/g,' ').trim();}
function resolveIngredient(term){const rows=ingredients(),needle=norm(term);if(!needle)return {mode:'none'};const exact=rows.find(x=>norm(x.name)===needle);if(exact)return {mode:'exact',item:exact};const typo=rows.map(item=>({item,d:editDistance(norm(item.name),needle)})).filter(x=>x.d<=Math.min(2,Math.max(1,Math.floor(needle.length/8)))).sort((a,b)=>a.d-b.d);if(typo.length===1)return {mode:'typo',item:typo[0].item};const partial=rows.filter(x=>norm(x.name).split(' ').includes(needle)||norm(x.name).includes(needle));return {mode:'missing',partial};}
function convert(amount,item){const target=canonical(item?.unit);if(!amount||amount.quantity===null)return {ok:true,quantity:null,unit:target};if(!amount.unit)return {ok:true,quantity:amount.quantity,unit:target||''};const from=defs[amount.unit],to=defs[target];if(!from||!to||from[0]!==to[0])return {ok:false,reason:'unit',from:amount.unit,to:target};return {ok:true,quantity:amount.quantity*from[1]/to[1],unit:target};}
function clearOldCards(){document.querySelectorAll?.('[data-ly-stock-safety="1"],[data-ly-command-suggestion="1"],[data-ly-sale-suggestion="1"],[data-ly-multi-sale-suggestion="1"]').forEach(n=>n.remove());}
function showMessage(html){const holder=document.getElementById?.('lyAssistantMessages');if(!holder)return false;clearOldCards();const card=document.createElement('div');card.className='ly-assistant-message is-assistant';card.dataset.lyStockSafety='1';card.innerHTML=html;holder.appendChild(card);holder.scrollTop=holder.scrollHeight;return true;}
function rewrite(input,op,item,converted){const q=converted.quantity,unit=converted.unit;input.dataset.originalCommand=input.value;input.value=`${op} ${q==null?'':`${fmt(q)}${unit?` ${unit}`:''} `}${item.name}`.replace(/\s+/g,' ').trim();}
function process(input){const source=norm(input.value),op=operation(source);if(!op)return {allow:true};const amount=amountOf(input.value),term=requestedTerm(input.value),resolved=resolveIngredient(term);
 if(resolved.mode==='exact'||resolved.mode==='typo'){
   const converted=convert(amount,resolved.item);
   if(!converted.ok){showMessage(`<div>Không thể dùng <b>${esc(amount?.unit||'đơn vị này')}</b> cho <b>${esc(resolved.item.name)}</b> vì nguyên liệu đang quản lý theo <b>${esc(resolved.item.unit||'')}</b>. Mình chưa tạo bản nháp để tránh sai số lượng.</div>`);return {allow:false};}
   rewrite(input,op,resolved.item,converted);return {allow:true};
 }
 if(resolved.mode==='missing'){
   const compatible=(resolved.partial||[]).filter(item=>{if(!amount?.unit)return true;const a=defs[amount.unit],b=defs[canonical(item.unit)];return !!a&&!!b&&a[0]===b[0];});
   let extra='';
   if(compatible.length)extra=`<div style="margin-top:8px">Tên gần nhất cùng loại đơn vị: ${compatible.slice(0,3).map(x=>`<b>${esc(x.name)} (${esc(x.unit||'')})</b>`).join(', ')}.</div>`;
   else if((resolved.partial||[]).length)extra=`<div style="margin-top:8px">Có ${resolved.partial.slice(0,3).map(x=>`<b>${esc(x.name)} (${esc(x.unit||'')})</b>`).join(', ')}, nhưng đơn vị không tương thích với <b>${esc(amount?.unit||'đơn vị đã nhập')}</b>.</div>`;
   showMessage(`<div>Mình không tìm thấy nguyên liệu chính xác <b>“${esc(term)}”</b> trong kho đang chọn. Mình chưa tạo phiếu để tránh chọn nhầm nguyên liệu.${extra}</div>`);return {allow:false};
 }
 return {allow:true};}
function install(){const drawer=document.getElementById?.('lyAssistantDrawer');if(!drawer||drawer.dataset.stockCommandNormalizer==='1')return false;drawer.dataset.stockCommandNormalizer='1';const handler=e=>{const send=e.target?.closest?.('[data-assistant-send]'),enter=e.type==='keydown'&&e.key==='Enter'&&!e.shiftKey;if(!send&&!enter)return;const input=document.getElementById?.('lyAssistantInput');if(!input?.value)return;const r=process(input);if(r.allow)return;e.preventDefault?.();e.stopImmediatePropagation?.();};drawer.addEventListener('click',handler,true);drawer.querySelector?.('#lyAssistantInput')?.addEventListener('keydown',handler,true);return true;}
function boot(i=0){if(install())return;if(i<50)setTimeout(()=>boot(i+1),100);}
window.__lyChatStockCommandNormalizer={version:VERSION,requestedTerm,resolveIngredient,convert,process,install,status:()=>({version:VERSION,installed:document.getElementById?.('lyAssistantDrawer')?.dataset?.stockCommandNormalizer==='1'})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot(),{once:true});else boot();
})();
