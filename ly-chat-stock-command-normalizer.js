(()=>{
'use strict';
const VERSION='2026.08.25.3';
if(window.__lyChatStockCommandNormalizer?.version===VERSION)return;
const text=v=>String(v??'').trim();
const vi=v=>text(v).toLocaleLowerCase('vi').replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ.,:/\-\s]/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>vi(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NUM='(\\d+(?:[.,]\\d+)?|nửa|một|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|nua|mot|bon|tu|nam|sau|bay|tam|chin|muoi)';
const UNIT='(kg|ký|kí|ky|ki|cân|can|kilogram|kilo|g|gram|gam|ml|l|lít|lit|liter)?';
const amountRe=new RegExp(`\\b${NUM}\\s*${UNIT}\\b`,'i');
const aliases={gram:'g',gam:'g','ký':'kg','kí':'kg',ky:'kg',ki:'kg','cân':'kg',can:'kg',kilogram:'kg',kilo:'kg','lít':'l',lit:'l',liter:'l'};
const defs={g:['mass',1],kg:['mass',1000],ml:['volume',1],l:['volume',1000]};
const context={op:'',at:0};
const CONTEXT_MS=3*60*1000;
const canonical=u=>aliases[vi(u)]||aliases[norm(u)]||norm(u);
const numberValue=v=>{const t=vi(v),w={'nửa':.5,nua:.5,'một':1,mot:1,hai:2,ba:3,'bốn':4,bon:4,'tư':4,tu:4,'năm':5,nam:5,'sáu':6,sau:6,'bảy':7,bay:7,'tám':8,tam:8,'chín':9,chin:9,'mười':10,muoi:10};if(t in w)return w[t];const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null;};
const fmt=v=>{const n=Math.round(Number(v)*1e6)/1e6;return Number.isInteger(n)?String(n):String(n).replace('.',',');};
function dbx(){try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db||{};}}
function ingredients(){const wid=text(window.currentWarehouseId);return (dbx().ingredients||[]).filter(x=>x?.id&&x?.name&&x?.active!==false&&(x.ingredient_type||'purchased')==='purchased'&&(!wid||!x?.warehouse_id||String(x.warehouse_id)===wid));}
function editDistance(a,b){a=norm(a);b=norm(b);const r=Array(b.length+1).fill(0).map((_,i)=>i);for(let i=1;i<=a.length;i++){let p=r[0];r[0]=i;for(let j=1;j<=b.length;j++){const c=r[j];r[j]=Math.min(r[j]+1,r[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=c;}}return r[b.length];}
function explicitOperation(source){const s=norm(source);if(/(^|\s)(nhap|nhap kho|nhap hang)(\s|$)/.test(s))return 'Nhập';if(/(^|\s)(xuat|xuat kho|xuat hang)(\s|$)/.test(s))return 'Xuất';if(/kiem ke|kiem kho|phieu kiem/.test(s))return 'Kiểm kê';return '';}
function rememberOperation(op){if(op){context.op=op;context.at=Date.now();}}
function contextualOperation(source,message){const explicit=explicitOperation(source);if(explicit){rememberOperation(explicit);return explicit;}const amount=amountOf(message),term=requestedTerm(message);if(amount&&term&&context.op&&Date.now()-context.at<=CONTEXT_MS)return context.op;return '';}
function amountOf(message){const m=vi(message).match(amountRe);return m?{quantity:numberValue(m[1]),unit:canonical(m[2]||''),raw:m[0]}:null;}
function requestedTerm(message){return vi(message)
 .replace(/\b(tạo|tao|lập|lap|thêm|them|mới|moi|giúp|giup|mình|minh|tôi|toi|cho|vui lòng|vui long|hãy|hay)\b/g,' ')
 .replace(/\b(phiếu|phieu|nhập kho|nhap kho|nhập hàng|nhap hang|nhập|nhap|xuất kho|xuat kho|xuất hàng|xuat hang|xuất|xuat|kiểm kê|kiem ke|kiểm kho|kiem kho|kiểm|kiem)\b/g,' ')
 .replace(amountRe,' ').replace(/\b(với|voi|nhé|nhe|ạ|a)\b/g,' ').replace(/\s+/g,' ').trim();}
function resolveIngredient(term){
  const rows=ingredients(),needleVi=vi(term),needle=norm(term);if(!needle)return {mode:'none'};
  const exactVi=rows.find(x=>vi(x.name)===needleVi);if(exactVi)return {mode:'exact',item:exactVi};
  const viTokens=needleVi.split(' ').filter(Boolean);
  if(viTokens.length===1){
    const firstVi=rows.filter(item=>vi(item.name).split(' ')[0]===needleVi);
    if(firstVi.length===1)return {mode:'alias',item:firstVi[0]};
    if(firstVi.length>1)return {mode:'missing',partial:firstVi};
  }
  const exactFold=rows.find(x=>norm(x.name)===needle);if(exactFold)return {mode:'folded',item:exactFold};
  const tokens=needle.split(' ').filter(Boolean);
  if(tokens.length===1){
    const firstFold=rows.filter(item=>norm(item.name).split(' ')[0]===needle);
    if(firstFold.length===1)return {mode:'folded-alias',item:firstFold[0]};
    if(firstFold.length>1)return {mode:'missing',partial:firstFold};
  }
  const typo=rows.map(item=>({item,d:editDistance(norm(item.name),needle)})).filter(x=>x.d<=Math.min(2,Math.max(1,Math.floor(needle.length/8)))).sort((a,b)=>a.d-b.d);
  if(typo.length===1)return {mode:'typo',item:typo[0].item};
  const partial=rows.filter(x=>norm(x.name).split(' ').includes(needle)||norm(x.name).includes(needle));return {mode:'missing',partial};
}
function convert(amount,item){const target=canonical(item?.unit);if(!amount||amount.quantity===null)return {ok:true,quantity:null,unit:target};if(!amount.unit)return {ok:true,quantity:amount.quantity,unit:target||''};const from=defs[amount.unit],to=defs[target];if(!from||!to||from[0]!==to[0])return {ok:false,reason:'unit',from:amount.unit,to:target};return {ok:true,quantity:amount.quantity*from[1]/to[1],unit:target};}
function clearOldCards(){document.querySelectorAll?.('[data-ly-stock-safety="1"],[data-ly-command-suggestion="1"],[data-ly-sale-suggestion="1"],[data-ly-multi-sale-suggestion="1"]').forEach(n=>n.remove());}
function showMessage(html){const holder=document.getElementById?.('lyAssistantMessages');if(!holder)return false;clearOldCards();const card=document.createElement('div');card.className='ly-assistant-message is-assistant';card.dataset.lyStockSafety='1';card.innerHTML=html;holder.appendChild(card);holder.scrollTop=holder.scrollHeight;return true;}
function rewrite(input,op,item,converted){const q=converted.quantity,unit=converted.unit;input.dataset.originalCommand=input.value;input.value=`${op} ${q==null?'':`${fmt(q)}${unit?` ${unit}`:''} `}${item.name}`.replace(/\s+/g,' ').trim();rememberOperation(op);}
function process(input){
  const op=contextualOperation(input.value,input.value);if(!op)return {allow:true};
  const amount=amountOf(input.value),term=requestedTerm(input.value),resolved=resolveIngredient(term);
  if(['exact','alias','folded','folded-alias','typo'].includes(resolved.mode)){
    const converted=convert(amount,resolved.item);
    if(!converted.ok){showMessage(`<div>Không thể dùng <b>${esc(amount?.unit||'đơn vị này')}</b> cho <b>${esc(resolved.item.name)}</b> vì nguyên liệu đang quản lý theo <b>${esc(resolved.item.unit||'')}</b>. Mình chưa tạo bản nháp để tránh sai số lượng.</div>`);return {allow:false};}
    rewrite(input,op,resolved.item,converted);return {allow:true};
  }
  if(resolved.mode==='missing'){
    rememberOperation(op);
    const compatible=(resolved.partial||[]).filter(item=>{if(!amount?.unit)return true;const a=defs[amount.unit],b=defs[canonical(item.unit)];return !!a&&!!b&&a[0]===b[0];});
    let extra='';
    if(compatible.length)extra=`<div style="margin-top:8px">Tên gần nhất cùng loại đơn vị: ${compatible.slice(0,3).map(x=>`<b>${esc(x.name)} (${esc(x.unit||'')})</b>`).join(', ')}.</div>`;
    else if((resolved.partial||[]).length)extra=`<div style="margin-top:8px">Có ${resolved.partial.slice(0,3).map(x=>`<b>${esc(x.name)} (${esc(x.unit||'')})</b>`).join(', ')}, nhưng đơn vị không tương thích với <b>${esc(amount?.unit||'đơn vị đã nhập')}</b>.</div>`;
    showMessage(`<div>Mình không tìm thấy nguyên liệu chính xác <b>“${esc(term)}”</b> trong kho đang chọn. Mình chưa tạo phiếu để tránh chọn nhầm nguyên liệu.${extra}</div>`);return {allow:false};
  }
  return {allow:true};
}
function install(){const drawer=document.getElementById?.('lyAssistantDrawer');if(!drawer||drawer.dataset.stockCommandNormalizer==='3')return false;drawer.dataset.stockCommandNormalizer='3';const handler=e=>{const send=e.target?.closest?.('[data-assistant-send]'),enter=e.type==='keydown'&&e.key==='Enter'&&!e.shiftKey;if(!send&&!enter)return;const input=document.getElementById?.('lyAssistantInput');if(!input?.value)return;const r=process(input);if(r.allow)return;e.preventDefault?.();e.stopImmediatePropagation?.();};drawer.addEventListener('click',handler,true);drawer.querySelector?.('#lyAssistantInput')?.addEventListener('keydown',handler,true);return true;}
function boot(i=0){if(install())return;if(i<50)setTimeout(()=>boot(i+1),100);}
window.__lyChatStockCommandNormalizer={version:VERSION,requestedTerm,resolveIngredient,convert,process,install,status:()=>({version:VERSION,installed:document.getElementById?.('lyAssistantDrawer')?.dataset?.stockCommandNormalizer==='3',context:{...context}})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot(),{once:true});else boot();
})();
