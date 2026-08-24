(()=>{
'use strict';
const VERSION='2026.08.25.6';
if(window.__lyChatSubmitControllerV6?.version===VERSION)return;
const text=v=>String(v??'').trim();
const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let busy=false;
function relevant(event){
  if(event.type==='click')return !!event.target?.closest?.('[data-assistant-send]');
  return event.type==='keydown'&&event.key==='Enter'&&!event.shiftKey&&event.target?.id==='lyAssistantInput';
}
function holder(){return document.getElementById('lyAssistantMessages');}
function input(){return document.getElementById('lyAssistantInput');}
function clearControllerCards(){document.querySelectorAll('[data-ly-submit-controller="1"]').forEach(n=>n.remove());}
function show(html){
  const h=holder();if(!h)return null;clearControllerCards();
  const card=document.createElement('div');card.className='ly-assistant-message is-assistant';card.dataset.lySubmitController='1';card.innerHTML=html;h.appendChild(card);h.scrollTop=h.scrollHeight;return card;
}
function fmt(v){const n=Math.round(Number(v)*1e6)/1e6;return Number.isInteger(n)?n.toLocaleString('vi-VN'):String(n).replace('.',',');}
async function directSubmit(){
  if(typeof window.__lyLocalAssistant?.submit!=='function')return false;
  await window.__lyLocalAssistant.submit();return true;
}
function compatibleCandidates(result){
  const core=window.__lyChatStockCoreV5,amount=result?.amount;
  return (result?.candidates||[]).filter(item=>{
    if(!amount?.unit)return true;
    return core?.convertAmount?.(amount,item)?.ok===true;
  });
}
function showStockAmbiguous(result){
  const rows=compatibleCandidates(result),amount=result.amount;
  const card=show(`<div>Mình hiểu bạn đang nói <b>“${esc(result.term)}”</b>${amount?.quantity!=null?` với số lượng <b>${esc(fmt(amount.quantity))}${amount.unit?` ${esc(amount.unit)}`:''}</b>`:''}, nhưng có nhiều nguyên liệu phù hợp. Bạn chọn đúng loại nhé.</div><div class="ly-assistant-choice"><b>Chọn nguyên liệu</b><div>${rows.map((item,i)=>`<button type="button" data-ly-stock-choice="${i}">${esc(item.name)}${item.unit?` · ${esc(item.unit)}`:''}</button>`).join('')}</div></div>`);
  if(!card)return;
  card.addEventListener('click',async event=>{
    const button=event.target?.closest?.('[data-ly-stock-choice]');if(!button)return;
    event.preventDefault();event.stopPropagation();
    const item=rows[Number(button.dataset.lyStockChoice)],core=window.__lyChatStockCoreV5,field=input();if(!item||!core||!field)return;
    const converted=core.convertAmount(result.amount,item);if(!converted?.ok)return;
    const op=core.operation(result.message)||'Nhập';
    field.value=`${op} ${converted.quantity==null?'':`${converted.quantity}${converted.unit?` ${converted.unit}`:''} `}${item.name}`.replace(/\s+/g,' ').trim();
    card.remove();await directSubmit();
  });
}
function showStockMissing(result){
  const rows=compatibleCandidates(result).slice(0,5);
  show(`<div>Mình không tìm thấy nguyên liệu chính xác <b>“${esc(result.term)}”</b> trong kho đang chọn. Mình chưa tạo phiếu để tránh chọn nhầm.${rows.length?`<div style="margin-top:8px">Tên liên quan cùng loại đơn vị: ${rows.map(x=>`<b>${esc(x.name)} (${esc(x.unit||'')})</b>`).join(', ')}.</div>`:''}</div>`);
}
function showInvalidUnit(result){
  show(`<div>Đơn vị <b>${esc(result.amount?.unit||'')}</b> không tương thích với <b>${esc(result.item?.name||result.term)}</b> (${esc(result.item?.unit||'')}). Mình chưa tạo phiếu để tránh sai số lượng.</div>`);
}
async function route(){
  if(busy)return;const field=input(),raw=text(field?.value);if(!field||!raw)return;
  busy=true;
  try{
    clearControllerCards();
    const core=window.__lyChatStockCoreV5;
    if(core?.preprocess){
      const stock=core.preprocess(raw);
      if(stock.mode==='ambiguous'){showStockAmbiguous(stock);return;}
      if(stock.mode==='missing'){showStockMissing(stock);return;}
      if(stock.mode==='invalid-unit'){showInvalidUnit(stock);return;}
      if(stock.mode==='resolved')field.value=stock.message;
    }
    const sale=window.__lyChatCommandNormalizer;
    if(sale?.processInput&&sale.processInput(field)===false)return;
    await directSubmit();
  }finally{busy=false;}
}
function capture(event){
  if(!relevant(event))return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void route();
}
document.addEventListener('click',capture,true);
document.addEventListener('keydown',capture,true);
window.__lyChatSubmitControllerV6={version:VERSION,route,status:()=>({version:VERSION,installed:true,busy,core:window.__lyChatStockCoreV5?.version||'',sale:window.__lyChatCommandNormalizer?.version||'',assistant:window.__lyLocalAssistant?.version||''})};
})();
