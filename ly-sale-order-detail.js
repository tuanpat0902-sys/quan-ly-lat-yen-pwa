(()=>{
  'use strict';
  const VERSION='2026.09.20.1';
  if(window.__lySaleOrderDetail?.version===VERSION)return;
  const nonnegative=value=>Math.max(0,Number(value)||0);
  const toppings=value=>{
    try{
      const rows=typeof value==='string'?JSON.parse(value):value;
      if(!Array.isArray(rows))return '';
      return rows.map(row=>typeof row==='string'?row:row?.topping_name||row?.item_name||row?.name||'')
        .map(name=>String(name).trim()).filter(Boolean).join(', ');
    }catch{return ''}
  };
  function show(saleId){
    const indexes=getDataIndexes();
    const sale=indexes.saleById.get(saleId)||(db.sales||[]).find(row=>row.id===saleId);
    if(!sale||sale.warehouse_id!==currentWarehouseId){alert('Không tìm thấy đơn hàng trong kho đang chọn.');return false;}
    const items=indexes.saleItemsBySale.get(saleId)||[];
    const subtotal=sale.subtotal!=null?nonnegative(sale.subtotal):items.reduce((sum,item)=>sum+nonnegative(item.line_subtotal??(Number(item.quantity||0)*Number(item.unit_price||0))),0);
    const itemDiscount=sale.item_discount_total!=null?nonnegative(sale.item_discount_total):items.reduce((sum,item)=>sum+nonnegative(item.item_discount),0);
    const receiptDiscount=sale.receipt_discount!=null?nonnegative(sale.receipt_discount):Math.max(0,nonnegative(sale.discount)-itemDiscount);
    const note=String(saleReceiptGeneralNote(sale)||'').trim();
    const rows=items.length?items.map((item,index)=>{
      const product=indexes.productById.get(item.product_id)||(db.products||[]).find(row=>row.id===item.product_id);
      const name=product?.name||item.product_name||item.item_name||item.name||`Món ${item.ipos_item_id||item.product_id||index+1}`;
      const extra=toppings(item.ipos_toppings);
      const lineTotal=item.line_total!=null?nonnegative(item.line_total):Math.max(0,nonnegative(item.line_subtotal??(Number(item.quantity||0)*Number(item.unit_price||0)))-nonnegative(item.item_discount));
      return `<tr><td>${index+1}</td><td><b>${esc(name)}</b>${extra?`<div class="muted">Thêm: ${esc(extra)}</div>`:''}</td><td>${esc(product?.unit||'Món')}</td><td class="right">${num(item.quantity||0)}</td><td class="right">${money(item.unit_price||0)}</td><td class="right">${nonnegative(item.item_discount)?'− '+money(item.item_discount):money(0)}</td><td class="right"><b>${money(lineTotal)}</b></td></tr>`;
    }).join(''):'<tr><td colspan="7" class="empty">Chưa có chi tiết món trong dữ liệu đồng bộ của phiếu này.</td></tr>';
    openModal(`<div class="sale-order-detail" role="dialog" aria-modal="true" aria-labelledby="saleOrderDetailTitle">
      <div class="modal-head"><h3 id="saleOrderDetailTitle">Chi tiết đơn hàng ${esc(saleReceiptNumber(sale))}</h3><button type="button" class="x" aria-label="Đóng chi tiết đơn hàng" onclick="closeModal()">×</button></div>
      <div class="muted">${esc(lyFreshSaleHistoryTime(sale.sold_at||sale.created_at))} · Nguồn: ${esc(sale.source||'manual')}</div>
      <div class="scroll section-gap"><table><thead><tr><th>STT</th><th>Món</th><th>Đơn vị</th><th class="right">SL</th><th class="right">Đơn giá</th><th class="right">Giảm món</th><th class="right">Thành tiền</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="sale-payment-summary section-gap"><div><span>Tạm tính</span><b>${money(subtotal)}</b></div><div><span>Giảm theo món</span><b>− ${money(itemDiscount)}</b></div><div><span>Giảm toàn phiếu</span><b>− ${money(receiptDiscount)}</b></div><div class="sale-final-total"><span>Thanh toán</span><b>${money(sale.total_amount||0)}</b></div></div>
      ${note?`<div class="section-gap"><b>Ghi chú</b><div>${esc(note)}</div></div>`:''}
      <div class="receipt-modal-actions section-gap"><button type="button" class="secondary" onclick="closeModal()">Đóng</button></div>
    </div>`);
    return true;
  }
  window.__lySaleOrderDetail={version:VERSION,show};
  window.viewSaleReceiptDetails=show;
})();
