(()=>{
  'use strict';
  const VERSION='2026.08.27.1';
  if(window.__lySalesReportRevenueCard?.version===VERSION)return;
  const text=value=>String(value??'').trim();
  const number=value=>{const n=Number(value);return Number.isFinite(n)?n:0;};
  const money=value=>`${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(number(value))} đ`;
  const pct=value=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(Math.abs(number(value)));
  const localISO=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const previousDay=iso=>{const [y,m,d]=text(iso).split('-').map(Number),date=new Date(y,m-1,d);if(!Number.isFinite(date.getTime()))return '';date.setDate(date.getDate()-1);return localISO(date);};
  function saleRevenue(row){for(const key of ['total_amount','net_amount','total','amount']){const v=Number(row?.[key]);if(Number.isFinite(v))return v;}const subtotal=Number(row?.subtotal),discount=number(row?.discount_amount??row?.discount_total);return Number.isFinite(subtotal)?Math.max(0,subtotal-discount):0;}
  function rowsFor(start,end){
    try{if(typeof window.saleReportRows==='function')return window.saleReportRows(start,end)||[];}catch(_){}
    const warehouseId=text(window.currentWarehouseId),rows=window.db?.sales||[];
    return rows.filter(row=>{const raw=row?.sold_at||row?.sale_date||row?.date||row?.created_at,date=raw?new Date(raw):null;if(!date||Number.isNaN(date.getTime()))return false;const iso=localISO(date);return iso>=start&&iso<=end&&(!warehouseId||String(row?.warehouse_id)===warehouseId);});
  }
  const revenueFor=(start,end)=>rowsFor(start,end).reduce((sum,row)=>sum+saleRevenue(row),0);
  function reportRange(){
    const mode=document.getElementById('saleReportMode')?.value||'day';
    if(mode==='day'){const day=document.getElementById('saleReportDate')?.value||localISO(new Date());return {mode,start:day,end:day};}
    if(mode==='month'){const month=document.getElementById('saleReportMonth')?.value||localISO(new Date()).slice(0,7),[y,m]=month.split('-').map(Number),last=new Date(y,m,0).getDate();return {mode,start:`${month}-01`,end:`${month}-${String(last).padStart(2,'0')}`};}
    const start=document.getElementById('saleReportFrom')?.value||localISO(new Date()),end=document.getElementById('saleReportTo')?.value||start;return {mode,start,end};
  }
  function comparisonLine(current,previous){
    if(previous===0)return current===0?'Không đổi 0% so với ngày trước':'';
    const change=(current-previous)/previous*100;
    if(Math.abs(change)<0.05)return 'Không đổi 0% so với ngày trước';
    return `${change>0?'Tăng':'Giảm'} ${pct(change)}% so với ngày trước`;
  }
  function inject(){
    const area=document.getElementById('saleReportArea'),grid=area?.querySelector?.('.sale-qty-summary');if(!grid)return false;
    grid.querySelector?.('[data-ly-sales-revenue-card]')?.remove?.();
    const range=reportRange(),current=revenueFor(range.start,range.end),card=document.createElement('div');card.className='card metric';card.dataset.lySalesRevenueCard='1';
    const line=range.mode==='day'?comparisonLine(current,revenueFor(previousDay(range.start),previousDay(range.start))):'';
    card.innerHTML=`<span class="muted">Doanh thu</span><div class="value" style="font-size:20px">${money(current)}</div>${line?`<div class="muted" style="margin-top:6px;font-size:13px;font-weight:700">${line}</div>`:''}`;
    grid.appendChild(card);return true;
  }
  function patch(){
    const current=window.renderSaleReport;if(typeof current!=='function')return false;if(current.__lyRevenueCardPatched)return true;
    const wrapped=function(...args){const result=current.apply(this,args);setTimeout(inject,0);return result;};wrapped.__lyRevenueCardPatched=true;window.renderSaleReport=wrapped;return true;
  }
  function sync(){patch();setTimeout(inject,0);}
  window.addEventListener?.('latyen:hydrated',sync);window.addEventListener?.('latyen:v2-hydrated',sync);sync();
  const timer=setInterval(()=>{if(patch())clearInterval(timer);},200);setTimeout(()=>clearInterval(timer),30000);
  window.__lySalesReportRevenueCard={version:VERSION,inject,patch,revenueFor,comparisonLine,status:()=>({version:VERSION,enabled:true})};
})();
