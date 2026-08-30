/* Lát Yên — Special Reports UI V1
   Read-only report renderers extracted from Legacy index.html. Core business/save/chart helpers remain resident. */
(()=>{
  'use strict';
  if(window.__lySpecialReportsModule?.version==='2026.08.29.5')return;
  function renderImportReport(){
    const area=$('importReportArea');
    if(!area)return;
  
    const mode=$('importReportMode')?.value||'day';
    const date=$('importReportDate')?.value||todayLocalISO();
    const month=$('importReportMonth')?.value||currentMonthISO();
    const from=$('importReportFrom')?.value||todayLocalISO();
    const to=$('importReportTo')?.value||todayLocalISO();
  
    const dayBox=$('importReportDayBox');
    const monthBox=$('importReportMonthBox');
    const rangeBox=$('importReportRangeBox');
  
    if(dayBox)dayBox.style.display=mode==='day'?'block':'none';
    if(monthBox)monthBox.style.display=mode==='month'?'block':'none';
    if(rangeBox)rangeBox.style.display=mode==='range'?'grid':'none';
  
    let startDate='',endDate='',title='';
  
    if(mode==='day'){
      startDate=endDate=date;
      title=`Ngày ${formatVNDate(date)}`;
    }else if(mode==='month'){
      const [y,m]=month.split('-').map(Number);
      startDate=`${month}-01`;
      const last=new Date(y,m,0).getDate();
      endDate=`${month}-${String(last).padStart(2,'0')}`;
      title=`Tháng ${String(m).padStart(2,'0')}/${y}`;
    }else{
      startDate=from;
      endDate=to;
      if(startDate>endDate){
        area.innerHTML='<div class="warnbox">Từ ngày không được lớn hơn đến ngày.</div>';
        return;
      }
      title=`Từ ${formatVNDate(startDate)} đến ${formatVNDate(endDate)}`;
    }
  
    const rows=importReportRowsByRange(startDate,endDate);
  
    const receipts=new Set(rows.map(m=>receiptGroupKeyForMovement(m)));
    const totalValue=rows.reduce((sum,m)=>sum+(importTotalFromMovement(m)||0),0);
    const totalLines=rows.length;
  
    const byIngredient={};
    const byDay={};
  
    for(const m of rows){
      const ing=db.ingredients.find(i=>i.id===m.ingredient_id);
      const key=m.ingredient_id;
      if(!byIngredient[key]){
        byIngredient[key]={
          id:key,
          name:ing?.name||'',
          unit:ing?.unit||'',
          quantity:0,
          total:0,
          receipts:new Set()
        };
      }
      byIngredient[key].quantity+=Number(m.quantity||0);
      byIngredient[key].total+=importTotalFromMovement(m)||0;
      byIngredient[key].receipts.add(receiptGroupKeyForMovement(m));
  
      const d=movementImportDateISO(m);
      if(!byDay[d])byDay[d]={date:d,quantity:0,total:0,receipts:new Set(),lines:0};
      byDay[d].quantity+=Number(m.quantity||0);
      byDay[d].total+=importTotalFromMovement(m)||0;
      byDay[d].receipts.add(receiptGroupKeyForMovement(m));
      byDay[d].lines++;
    }
  
    const ingredients=Object.values(byIngredient).sort((a,b)=>b.total-a.total);
    const days=Object.values(byDay).sort((a,b)=>b.date.localeCompare(a.date));
  
    area.innerHTML=`
      <div class="report-summary-grid">
        <div class="card metric">
          <span class="muted">Số phiếu nhập</span>
          <div class="value">${num(receipts.size)}</div>
        </div>
  
        <div class="card metric">
          <span class="muted">Dòng mặt hàng nhập</span>
          <div class="value">${num(totalLines)}</div>
        </div>
  
        <div class="card metric">
          <span class="muted">Số loại nguyên liệu/ dụng cụ</span>
          <div class="value">${num(ingredients.length)}</div>
        </div>
  
        <div class="card metric">
          <span class="muted">Tổng giá trị nhập</span>
          <div class="value" style="font-size:20px">${money(totalValue)}</div>
        </div>
      </div>
  
      <div class="section-gap">
        <h3>Chi tiết nhập kho — ${esc(title)}</h3>
  
        ${rows.length?`
          <div class="scroll">
            <table class="warehouse-import-summary-table" data-ly-table-view="specialImportSummary">
              <tr>
                <th>Nguyên liệu/ Dụng cụ</th>
                <th>Đơn vị</th>
                <th class="right">Tổng số lượng nhập</th>
                <th class="right">Số phiếu</th>
                <th class="right">Tổng giá trị</th>
                <th class="right">Giá nhập TB/đv</th>
              </tr>
              ${ingredients.map(x=>`
                <tr>
                  <td><b>${esc(x.name)}</b></td>
                  <td>${esc(x.unit)}</td>
                  <td class="right"><b>${num(x.quantity)}</b></td>
                  <td class="right">${num(x.receipts.size)}</td>
                  <td class="right">${money(x.total)}</td>
                  <td class="right">${x.quantity>0?money(x.total/x.quantity):'—'}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        `:'<div class="empty">Không có dữ liệu nhập kho trong khoảng thời gian này.</div>'}
      </div>
  
      ${rows.length?`
        <div class="section-gap">
          <h3>Chi tiết từng dòng nhập</h3>
  
          <div class="scroll">
            <table class="warehouse-report-detail-table" data-ly-table-view="specialImportDetails">
              <tr>
                <th>Ngày</th>
                <th>Số phiếu</th>
                <th>Nguyên liệu/Dụng cụ</th>
                <th>Đơn vị</th>
                <th class="right">Số lượng</th>
                <th class="right">Đơn giá</th>
                <th class="right">Thành tiền</th>
              </tr>
  
              ${rows.map(m=>{
                const ing=(db.ingredients||[]).find(
                  i=>i.id===m.ingredient_id
                );
  
                return `
                  <tr>
                    <td>${formatVNDate(movementImportDateISO(m))}</td>
                    <td>${esc(receiptNumberFromMovement(m))}</td>
                    <td><b>${esc(ing?.name||'Mặt hàng đã xóa')}</b></td>
                    <td>${esc(ing?.unit||'')}</td>
                    <td class="right">${num(Number(m.quantity||0))}</td>
                    <td class="right">${money(importCostFromMovement(m)||0)}</td>
                    <td class="right"><b>${money(importTotalFromMovement(m)||0)}</b></td>
                  </tr>
                `;
              }).join('')}
            </table>
          </div>
        </div>
      `:''}
  
      ${mode!=='day' && days.length?`
        <div class="section-gap">
          <h3>Tổng hợp theo ngày</h3>
          <div class="scroll">
            <table class="warehouse-import-daily-table" data-ly-table-view="specialImportDaily">
              <tr>
                <th>Ngày</th>
                <th class="right">Số phiếu</th>
                <th class="right">Dòng mặt hàng</th>
                <th class="right">Tổng số lượng*</th>
                <th class="right">Giá trị nhập</th>
              </tr>
              ${days.map(d=>`
                <tr>
                  <td>${formatVNDate(d.date)}</td>
                  <td class="right">${num(d.receipts.size)}</td>
                  <td class="right">${num(d.lines)}</td>
                  <td class="right">${num(d.quantity)}</td>
                  <td class="right">${money(d.total)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          <div class="footer-note">* Tổng số lượng cộng theo số học; với các nguyên liệu/ dụng cụ khác đơn vị (g, ml, cái...) nên xem bảng chi tiết theo nguyên liệu/ dụng cụ để đối chiếu chính xác.</div>
        </div>
      `:''}
    `;
    (window.queueMicrotask||window.setTimeout)?.(()=>window.__lyTableViewV2?.apply?.(area),0);
  }

  function renderExportReport(){
    const area=$('exportReportArea');
    if(!area)return;
  
    const mode=$('exportReportMode')?.value||'day';
    const date=$('exportReportDate')?.value||todayLocalISO();
    const month=$('exportReportMonth')?.value||currentMonthISO();
    const from=$('exportReportFrom')?.value||todayLocalISO();
    const to=$('exportReportTo')?.value||todayLocalISO();
  
    const dayBox=$('exportReportDayBox');
    const monthBox=$('exportReportMonthBox');
    const rangeBox=$('exportReportRangeBox');
  
    if(dayBox)dayBox.style.display=mode==='day'?'block':'none';
    if(monthBox)monthBox.style.display=mode==='month'?'block':'none';
    if(rangeBox)rangeBox.style.display=mode==='range'?'grid':'none';
  
    let startDate='',endDate='',title='';
  
    if(mode==='day'){
      startDate=endDate=date;
      title=`Ngày ${formatVNDate(date)}`;
  
    }else if(mode==='month'){
      const [y,m]=month.split('-').map(Number);
  
      startDate=`${month}-01`;
  
      const last=new Date(y,m,0).getDate();
  
      endDate=
        `${month}-${String(last).padStart(2,'0')}`;
  
      title=`Tháng ${String(m).padStart(2,'0')}/${y}`;
  
    }else{
      startDate=from;
      endDate=to;
  
      if(startDate>endDate){
        area.innerHTML=
          '<div class="warnbox">Từ ngày không được lớn hơn đến ngày.</div>';
        return;
      }
  
      title=
        `Từ ${formatVNDate(startDate)} `+
        `đến ${formatVNDate(endDate)}`;
    }
  
    const rows=exportReportRowsByRange(
      startDate,
      endDate
    );
  
    const receipts=new Set(
      rows.map(m=>String(m.reference_id||m.id||''))
    );
  
    const totalValue=rows.reduce(
      (sum,m)=>sum+Number(exportTotalFromMovement(m)||0),
      0
    );
  
    const byIngredient={};
    const byDay={};
  
    for(const m of rows){
      const ing=(db.ingredients||[]).find(
        i=>i.id===m.ingredient_id
      );
  
      const key=m.ingredient_id;
      const qty=Math.abs(Number(m.quantity||0));
      const total=Number(exportTotalFromMovement(m)||0);
      const receiptKey=String(m.reference_id||m.id||'');
  
      if(!byIngredient[key]){
        byIngredient[key]={
          id:key,
          name:ing?.name||'Mặt hàng đã xóa',
          unit:ing?.unit||'',
          quantity:0,
          total:0,
          receipts:new Set()
        };
      }
  
      byIngredient[key].quantity+=qty;
      byIngredient[key].total+=total;
      byIngredient[key].receipts.add(receiptKey);
  
      const d=movementExportDateISO(m);
  
      if(!byDay[d]){
        byDay[d]={
          date:d,
          quantity:0,
          total:0,
          receipts:new Set(),
          lines:0
        };
      }
  
      byDay[d].quantity+=qty;
      byDay[d].total+=total;
      byDay[d].receipts.add(receiptKey);
      byDay[d].lines++;
    }
  
    const ingredients=Object.values(byIngredient)
      .sort((a,b)=>b.total-a.total);
  
    const days=Object.values(byDay)
      .sort((a,b)=>b.date.localeCompare(a.date));
  
    area.innerHTML=`
      <div class="report-summary-grid">
        <div class="card metric">
          <span class="muted">Số phiếu xuất</span>
          <div class="value">${num(receipts.size)}</div>
        </div>
  
        <div class="card metric">
          <span class="muted">Dòng mặt hàng xuất</span>
          <div class="value">${num(rows.length)}</div>
        </div>
  
        <div class="card metric">
          <span class="muted">Số loại nguyên liệu/dụng cụ</span>
          <div class="value">${num(ingredients.length)}</div>
        </div>
  
        <div class="card metric">
          <span class="muted">Tổng giá trị xuất</span>
          <div class="value" style="font-size:20px">${money(totalValue)}</div>
        </div>
      </div>
  
      <div class="section-gap">
        <h3>Chi tiết xuất kho — ${esc(title)}</h3>
  
        ${rows.length?`
          <div class="scroll">
            <table class="warehouse-report-summary-table" data-ly-table-view="specialExportSummary">
              <tr>
                <th>Nguyên liệu/Dụng cụ</th>
                <th>Đơn vị</th>
                <th class="right">Tổng SL xuất</th>
                <th class="right">Số phiếu</th>
                <th class="right">Tổng giá trị</th>
                <th class="right">Đơn giá TB/đv</th>
              </tr>
  
              ${ingredients.map(x=>`
                <tr>
                  <td><b>${esc(x.name)}</b></td>
                  <td>${esc(x.unit)}</td>
                  <td class="right"><b>${num(x.quantity)}</b></td>
                  <td class="right">${num(x.receipts.size)}</td>
                  <td class="right">${money(x.total)}</td>
                  <td class="right">
                    ${x.quantity>0
                      ?money(x.total/x.quantity)
                      :'—'}
                  </td>
                </tr>
              `).join('')}
            </table>
          </div>
  
          <div class="section-gap">
            <h3>Chi tiết từng dòng xuất</h3>
  
            <div class="scroll">
              <table class="warehouse-report-detail-table" data-ly-table-view="specialExportDetails">
                <tr>
                  <th>Ngày</th>
                  <th>Số phiếu</th>
                  <th>Nguyên liệu/Dụng cụ</th>
                  <th>Đơn vị</th>
                  <th class="right">Số lượng</th>
                  <th class="right">Đơn giá</th>
                  <th class="right">Thành tiền</th>
                </tr>
  
                ${rows.map(m=>{
                  const ing=(db.ingredients||[]).find(
                    i=>i.id===m.ingredient_id
                  );
  
                  return `
                    <tr>
                      <td>${formatVNDate(movementExportDateISO(m))}</td>
                      <td>${esc(exportReceiptNumberFromMovement(m))}</td>
                      <td><b>${esc(ing?.name||'Mặt hàng đã xóa')}</b></td>
                      <td>${esc(ing?.unit||'')}</td>
                      <td class="right">${num(Math.abs(Number(m.quantity||0)))}</td>
                      <td class="right">${money(exportCostFromMovement(m)||0)}</td>
                      <td class="right"><b>${money(exportTotalFromMovement(m)||0)}</b></td>
                    </tr>
                  `;
                }).join('')}
              </table>
            </div>
          </div>
        `:'<div class="empty">Không có dữ liệu xuất kho trong khoảng thời gian này.</div>'}
      </div>
  
      ${mode!=='day' && days.length?`
        <div class="section-gap">
          <h3>Tổng hợp xuất kho theo ngày</h3>
  
          <div class="scroll">
            <table class="warehouse-export-daily-table" data-ly-table-view="specialExportDaily">
              <tr>
                <th>Ngày</th>
                <th class="right">Số phiếu</th>
                <th class="right">Dòng mặt hàng</th>
                <th class="right">Tổng số lượng*</th>
                <th class="right">Giá trị xuất</th>
              </tr>
  
              ${days.map(d=>`
                <tr>
                  <td>${formatVNDate(d.date)}</td>
                  <td class="right">${num(d.receipts.size)}</td>
                  <td class="right">${num(d.lines)}</td>
                  <td class="right">${num(d.quantity)}</td>
                  <td class="right">${money(d.total)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
  
          <div class="footer-note">
            * Tổng số lượng cộng theo số học; nếu có nhiều đơn vị khác nhau
            (g, ml, cái...) nên xem bảng chi tiết theo từng nguyên liệu/dụng cụ.
          </div>
        </div>
      `:''}
    `;
    (window.queueMicrotask||window.setTimeout)?.(()=>window.__lyTableViewV2?.apply?.(area),0);
  }

  function renderSaleReport(){
    const area=$('saleReportArea');
    if(!area)return;
  
    const mode=$('saleReportMode')?.value||'day';
    const dayBox=$('saleReportDayBox');
    const monthBox=$('saleReportMonthBox');
    const rangeBox=$('saleReportRangeBox');
  
    if(dayBox)dayBox.style.display=mode==='day'?'block':'none';
    if(monthBox)monthBox.style.display=mode==='month'?'block':'none';
    if(rangeBox)rangeBox.style.display=mode==='range'?'grid':'none';
  
    const range=saleReportRange();
    if(range.start>range.end){
      area.innerHTML='<div class="warnbox">Từ ngày không được lớn hơn đến ngày.</div>';
      return;
    }
  
    const sales=saleReportRows(range.start,range.end);
    const saleIds=new Set(sales.map(s=>s.id));
    const items=(db.saleItems||[]).filter(x=>saleIds.has(x.sale_id));
    const qty=items.reduce((sum,x)=>sum+Number(x.quantity||0),0);
    const revenue=sales.reduce((sum,s)=>sum+Number(s.total_amount??s.net_amount??s.total??s.amount??0),0);
  
    const byProduct={};
    for(const it of items){
      const p=db.products.find(x=>x.id===it.product_id);
      const key=it.product_id||'deleted';
      if(!byProduct[key]){
        byProduct[key]={
          name:p?.name||'Món đã xóa',
          unit:p?.unit||productUnitMap?.()[p?.id]||'ly',
          qty:0
        };
      }
      byProduct[key].qty+=Number(it.quantity||0);
    }
  
    const ranked=Object.values(byProduct).sort((a,b)=>b.qty-a.qty);
    const top=ranked[0];
  
    area.innerHTML=`
      <div class="report-summary-grid sale-qty-summary">
        <div class="card metric" data-ly-sales-revenue-card data-ly-sales-revenue-native="1">
          <span class="muted">Doanh thu</span>
          <div class="value">${money(revenue)}</div>
        </div>
        <div class="card metric">
          <span class="muted">Số phiếu bán</span>
          <div class="value">${num(sales.length)}</div>
        </div>
        <div class="card metric">
          <span class="muted">Tổng số lượng bán</span>
          <div class="value">${num(qty)}</div>
        </div>
        <div class="card metric">
          <span class="muted">Món bán chạy nhất</span>
          <div class="value sale-top-product">${top?esc(top.name):'—'}</div>
          ${top?`<div class="muted">${num(top.qty)} ${esc(top.unit||'')}</div>`:''}
        </div>
      </div>
  
      <div class="sale-analysis-grid section-gap">
        <div class="card sale-analysis-panel sale-chart-panel">
          <h3>Biểu đồ số lượng bán — ${esc(range.title)}</h3>
          <div class="sale-chart-scroll" aria-label="Biểu đồ số lượng bán có thể cuộn ngang">
            <canvas id="saleQtyChart" height="220"></canvas>
          </div>
        </div>

        <div class="card sale-analysis-panel sale-table-panel">
          <h3>Thống kê số lượng theo món</h3>
          ${ranked.length?`
            <div class="scroll">
              <table class="sale-quantity-table" data-ly-table-view="specialSalesQuantity">
                <tr>
                  <th>STT</th>
                  <th>Món</th>
                  <th>Đơn vị</th>
                  <th class="right">Số lượng bán</th>
                  <th class="right">Tỷ trọng</th>
                </tr>
                ${ranked.map((x,index)=>`
                  <tr>
                    <td>${index+1}</td>
                    <td><b>${esc(x.name)}</b></td>
                    <td>${esc(x.unit||'')}</td>
                    <td class="right"><b>${num(x.qty)}</b></td>
                    <td class="right">${qty?((x.qty/qty)*100).toFixed(1):'0.0'}%</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          `:'<div class="empty">Không có dữ liệu bán hàng trong khoảng thời gian này.</div>'}
        </div>
      </div>
    `;
  
    (window.queueMicrotask||window.setTimeout)?.(()=>window.__lyTableViewV2?.apply?.(area),0);
    setTimeout(()=>drawSaleReportCharts(sales,items,range.mode),0);
  }

  window.renderImportReport=renderImportReport;
  window.renderExportReport=renderExportReport;
  window.renderSaleReport=renderSaleReport;
  window.__lySpecialReportsModule={version:'2026.08.30.2'};
})();
