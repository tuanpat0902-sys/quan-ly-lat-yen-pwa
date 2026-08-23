/* Lát Yên — Finance UI V1
   UI/render only. Finance calculations remain in Legacy core. */
(()=>{
  'use strict';
  if(window.__lyFinanceUIV1)return;
  window.__lyFinanceUIV1=true;
  const VERSION='2026.08.23.1';

  function renderFinance(){
    if(!E.finance)return;
  
    E.finance.innerHTML=`
      <div class="finance-header">
        <div>
          <h2>Báo cáo tài chính — ${esc(warehouse()?.name||'')}</h2>
          <div class="muted">Theo dõi doanh thu, giá vốn, lợi nhuận, Thu/Chi và giá trị chênh lệch kiểm kê theo thời gian.</div>
        </div>
        <div class="finance-period-badge" id="financePeriodLabel"></div>
      </div>
  
      <div class="card finance-filter-card">
        <div class="finance-filter-row">
          <div>
            <label>Chế độ xem</label>
            <select id="financeMode" onchange="renderFinanceData()">
              <option value="day">Theo ngày</option>
              <option value="month" selected>Theo tháng</option>
              <option value="year">Theo năm</option>
              <option value="range">Khoảng thời gian</option>
            </select>
          </div>
  
          <div id="financeDayBox" style="display:none">
            <label>Ngày</label>
            <input id="financeDay" type="date" value="${todayLocalISO()}" onchange="renderFinanceData()">
          </div>
  
          <div id="financeMonthBox">
            <label>Tháng</label>
            <input id="financeMonth" type="month" value="${currentMonthISO()}" onchange="renderFinanceData()">
          </div>
  
          <div id="financeYearBox" style="display:none">
            <label>Năm</label>
            <input
              id="financeYear"
              class="finance-year-input"
              type="number"
              min="2000"
              max="2100"
              step="1"
              value="${financeCurrentYear()}"
              onchange="renderFinanceData()"
            >
          </div>
  
          <div id="financeRangeBox" class="finance-range-box" style="display:none">
            <div>
              <label>Từ ngày</label>
              <input id="financeFrom" type="date" value="${financeDefaultFromDate()}">
            </div>
            <div>
              <label>Đến ngày</label>
              <input id="financeTo" type="date" value="${todayLocalISO()}">
            </div>
            <button type="button" class="primary finance-apply-range" onclick="renderFinanceData()">Xem báo cáo</button>
          </div>
        </div>
  
        <div class="finance-quick-ranges">
          <button type="button" class="secondary sm" onclick="setFinanceQuickRange('today')">Hôm nay</button>
          <button type="button" class="secondary sm" onclick="setFinanceQuickRange('7d')">7 ngày</button>
          <button type="button" class="secondary sm" onclick="setFinanceQuickRange('30d')">30 ngày</button>
          <button type="button" class="secondary sm" onclick="setFinanceQuickRange('month')">Tháng này</button>
          <button type="button" class="secondary sm" onclick="setFinanceQuickRange('year')">Năm này</button>
        </div>
      </div>
  
      <div id="financeReportArea" class="section-gap"></div>
    `;
  
    setTimeout(()=>renderFinanceData(),0);
  }

  function renderFinanceData(){
    const area=$('financeReportArea');
    if(!area)return;
  
    const mode=$('financeMode')?.value||'month';
  
    if($('financeDayBox')){
      $('financeDayBox').style.display=
        mode==='day'?'block':'none';
    }
  
    if($('financeMonthBox')){
      $('financeMonthBox').style.display=
        mode==='month'?'block':'none';
    }
  
    if($('financeYearBox')){
      $('financeYearBox').style.display=
        mode==='year'?'block':'none';
    }
  
    if($('financeRangeBox')){
      $('financeRangeBox').style.display=
        mode==='range'?'grid':'none';
    }
  
    const r=financeRange();
  
    if(r.start>r.end){
      area.innerHTML=
        '<div class="warnbox">Từ ngày không được lớn hơn đến ngày.</div>';
      return;
    }
  
    if($('financePeriodLabel')){
      $('financePeriodLabel').textContent=r.label;
    }
  
    const sales=financeSalesInRange(r.start,r.end);
    const imports=financeImportsInRange(r.start,r.end);
    const exports=financeExportsInRange(r.start,r.end);
    const inventoryPeriod=
      financeInventoryPeriod(r.start,r.end);
  
    const revenue=sales.reduce(
      (sum,s)=>sum+Number(s.total_amount||0),
      0
    );
  
    const cogs=sales.reduce(
      (sum,s)=>sum+saleCogsValue(s),
      0
    );
  
    const grossProfit=revenue-cogs;
    const grossMargin=
      revenue>0
        ?grossProfit/revenue*100
        :0;
  
    const salaryCostInfo=
      financeSalaryCostInRange(r.start,r.end);
  
    const salaryCost=salaryCostInfo.total;
  
    const cashflowInfo=
      financeCashflowInRange(r.start,r.end);
  
    const otherIncome=cashflowInfo.income;
    const operatingExpense=cashflowInfo.expense;
    const cashflowNet=otherIncome-operatingExpense;
  
    const stocktakeInfo=
      financeStocktakeInRange(r.start,r.end);
  
    const stocktakeShortage=stocktakeInfo.shortage;
    const stocktakeSurplus=stocktakeInfo.surplus;
    const stocktakeNet=stocktakeInfo.net;
  
    const exportExpenseValue=
      inventoryPeriod.exportExpenseValue;
  
    const profitAfterSalary=
      grossProfit-salaryCost;
  
    const profitAfterCashflow=
      profitAfterSalary+
      cashflowNet+
      stocktakeNet-
      exportExpenseValue;
  
    const profitAfterCashflowMargin=
      revenue>0
        ?profitAfterCashflow/revenue*100
        :0;
  
    const importValue=inventoryPeriod.importValue;
    const exportValue=inventoryPeriod.exportValue;
  
    const exportInventoryOnlyValue=
      inventoryPeriod.exportInventoryOnlyValue;
  
    const openingInventoryValue=
      inventoryPeriod.opening.netValue;
  
    const closingInventoryValue=
      inventoryPeriod.closing.netValue;
  
    const inventoryDeficitValue=
      inventoryPeriod.closing.deficitValue;
  
    const inventoryNegativeItems=
      inventoryPeriod.closing.negativeItems;
  
    const ticket=
      sales.length
        ?revenue/sales.length
        :0;
  
    const totalMainCosts=
      cogs+
      salaryCost+
      operatingExpense+
      exportExpenseValue;
  
    const indexes=getDataIndexes();
    const soldItems=[];
  
    for(const sale of sales){
      const items=indexes.saleItemsBySale.get(sale.id)||[];
      soldItems.push(...items);
    }
  
    const qtySold=soldItems.reduce(
      (sum,x)=>sum+Number(x.quantity||0),
      0
    );
  
    const byProduct={};
  
    for(const it of soldItems){
      const p=indexes.productById.get(it.product_id);
  
      if(!p)continue;
  
      const key=p.id;
  
      if(!byProduct[key]){
        byProduct[key]={
          name:p.name,
          unit:p.unit||productUnitMap?.()[p.id]||'ly',
          qty:0,
          revenue:0,
          cogs:0
        };
      }
  
      const q=Number(it.quantity||0);
  
      byProduct[key].qty+=q;
      byProduct[key].revenue+=
        Number(it.unit_price||0)*q;
  
      byProduct[key].cogs+=
        productCost(p)*q;
    }
  
    const products=Object.values(byProduct)
      .map(x=>({
        ...x,
        profit:x.revenue-x.cogs,
        margin:x.revenue>0
          ?(x.revenue-x.cogs)/x.revenue*100
          :0
      }))
      .sort((a,b)=>b.revenue-a.revenue);
  
    const resultStatus=
      profitAfterCashflow>0
        ?'Có lãi'
        :profitAfterCashflow<0
          ?'Đang lỗ'
          :'Hòa vốn';
  
    area.innerHTML=`
      <div class="finance-overview-head">
        <div>
          <h2>Tổng quan tài chính</h2>
          <div class="muted">
            ${esc(r.label)} • ${esc(warehouse()?.name||'Kho đang chọn')}
          </div>
        </div>
  
        <span class="finance-result-pill ${
          profitAfterCashflow<0
            ?'loss'
            :profitAfterCashflow>0
              ?'gain'
              :'neutral'
        }">
          ${resultStatus}
        </span>
      </div>
  
      <div class="finance-overview-grid">
        <div class="finance-overview-card revenue">
          <span>Doanh thu</span>
          <strong>${money(revenue)}</strong>
          <small>
            ${num(sales.length)} phiếu
            • ${num(qtySold)} sản phẩm
          </small>
        </div>
  
        <div class="finance-overview-card cost">
          <span>Chi phí chính</span>
          <strong>${money(totalMainCosts)}</strong>
          <small>
            Giá vốn + lương + vận hành + xuất tiêu hao
          </small>
        </div>
  
        <div class="finance-overview-card profit-card">
          <span>Lợi nhuận cuối kỳ</span>
          <strong class="${profitAfterCashflow<0?'neg':'profit'}">
            ${money(profitAfterCashflow)}
          </strong>
          <small>
            Biên lợi nhuận ${num(profitAfterCashflowMargin)}%
          </small>
        </div>
  
        <div class="finance-overview-card inventory">
          <span>Tồn kho cuối kỳ</span>
          <strong class="${closingInventoryValue<0?'neg':''}">
            ${money(closingInventoryValue)}
          </strong>
          <small>
            ${inventoryNegativeItems
              ?`${inventoryNegativeItems} mặt hàng âm kho`
              :'Không có mặt hàng âm kho'}
          </small>
        </div>
      </div>
  
      <div class="finance-quick-facts">
        <div>
          <span>Giá vốn bán hàng</span>
          <b>${money(cogs)}</b>
        </div>
  
        <div>
          <span>Lương</span>
          <b>${money(salaryCost)}</b>
        </div>
  
        <div>
          <span>Chênh lệch Thu/Chi</span>
          <b class="${cashflowNet<0?'neg':cashflowNet>0?'profit':''}">
            ${cashflowNet>0?'+':''}${money(cashflowNet)}
          </b>
        </div>
  
        <div>
          <span>Giá trị TB/phiếu</span>
          <b>${money(ticket)}</b>
        </div>
      </div>
  
      <div class="finance-visual-grid section-gap">
        <div class="card finance-simple-pl-card">
          <div class="finance-card-head">
            <div>
              <h3>Kết quả kinh doanh</h3>
              <div class="muted">
                Chỉ các khoản thực sự ảnh hưởng lợi nhuận.
              </div>
            </div>
          </div>
  
          <div class="finance-simple-pl">
            <div class="plus">
              <span>Doanh thu thuần</span>
              <b>+ ${money(revenue)}</b>
            </div>
  
            <div class="minus">
              <span>Giá vốn hàng bán</span>
              <b>− ${money(cogs)}</b>
            </div>
  
            <div class="minus">
              <span>Chi phí lương</span>
              <b>− ${money(salaryCost)}</b>
            </div>
  
            <div class="${cashflowNet<0?'minus':'plus'}">
              <span>Chênh lệch Thu/Chi</span>
              <b>
                ${cashflowNet>0?'+ ':cashflowNet<0?'− ':''}
                ${money(Math.abs(cashflowNet))}
              </b>
            </div>
  
            <div class="minus">
              <span>Xuất kho tính chi phí</span>
              <b>− ${money(exportExpenseValue)}</b>
            </div>
  
            <div class="${stocktakeNet<0?'minus':'plus'}">
              <span>Chênh lệch kiểm kê</span>
              <b>
                ${stocktakeNet>0?'+ ':stocktakeNet<0?'− ':''}
                ${money(Math.abs(stocktakeNet))}
              </b>
            </div>
  
            <div class="finance-simple-pl-result">
              <span>Lợi nhuận cuối kỳ</span>
              <b class="${profitAfterCashflow<0?'neg':'profit'}">
                ${money(profitAfterCashflow)}
              </b>
            </div>
          </div>
  
          <div class="finance-simple-rule">
            <b>Nguyên tắc:</b>
            Nhập kho và tồn kho là tài sản, không trừ trực tiếp vào lợi nhuận.
            Giá vốn chỉ được tính một lần khi bán.
          </div>
        </div>
  
        <div class="card finance-chart-card finance-chart-card-v179">
          <div class="finance-card-head">
            <div>
              <h3>Xu hướng</h3>
              <div class="muted">
                ${mode==='year'
                  ?'Doanh thu và lợi nhuận gộp theo 12 tháng.'
                  :'Doanh thu và lợi nhuận gộp theo ngày.'}
              </div>
            </div>
          </div>
  
          <canvas id="financeTrendChart"></canvas>
        </div>
      </div>
  
      <div class="card section-gap finance-stock-simple-card">
        <div class="finance-card-head">
          <div>
            <h3>Kho & dòng hàng</h3>
            <div class="muted">
              Theo dõi tài sản kho riêng, không trộn vào kết quả kinh doanh.
            </div>
          </div>
        </div>
  
        <div class="finance-stock-flow">
          <div class="stock-flow-box">
            <span>Tồn đầu kỳ</span>
            <b class="${openingInventoryValue<0?'neg':''}">
              ${money(openingInventoryValue)}
            </b>
          </div>
  
          <div class="stock-flow-arrow">→</div>
  
          <div class="stock-flow-box in">
            <span>Nhập kho</span>
            <b>+ ${money(importValue)}</b>
          </div>
  
          <div class="stock-flow-arrow">→</div>
  
          <div class="stock-flow-box out">
            <span>Xuất kho</span>
            <b>− ${money(exportValue)}</b>
          </div>
  
          <div class="stock-flow-arrow">→</div>
  
          <div class="stock-flow-box ending">
            <span>Tồn cuối kỳ</span>
            <b class="${closingInventoryValue<0?'neg':''}">
              ${money(closingInventoryValue)}
            </b>
          </div>
        </div>
  
        <div class="finance-stock-subfacts">
          <span>
            Xuất luân chuyển:
            <b>${money(exportInventoryOnlyValue)}</b>
          </span>
  
          <span>
            Xuất tính chi phí:
            <b class="${exportExpenseValue>0?'neg':''}">
              ${money(exportExpenseValue)}
            </b>
          </span>
  
          <span>
            Kiểm kê ròng:
            <b class="${stocktakeNet<0?'neg':stocktakeNet>0?'profit':''}">
              ${stocktakeNet>0?'+':''}${money(stocktakeNet)}
            </b>
          </span>
        </div>
  
        ${inventoryNegativeItems?`
          <div class="finance-inventory-warning">
            ⚠ Có <b>${inventoryNegativeItems}</b> mặt hàng âm kho,
            giá trị âm ước tính
            <b>${money(inventoryDeficitValue)}</b>.
          </div>
        `:''}
  
        ${cashflowInfo.excludedInventoryPayments.length?`
          <div class="finance-inventory-payment-note">
            Đã loại khỏi P&L
            <b>${money(cashflowInfo.excludedInventoryPaymentTotal)}</b>
            tiền thanh toán nhập kho để tránh tính trùng chi phí.
          </div>
        `:''}
  
        <div class="finance-note">
          Tồn đầu/cuối kỳ là giá trị ước tính theo số lượng lịch sử và giá vốn hiện tại.
          Bán hàng và kiểm kê cũng làm thay đổi tồn thực tế nên sơ đồ trên dùng để
          <b>quan sát dòng hàng</b>, không phải phương trình kế toán tồn kho.
        </div>
      </div>
  
      ${mode==='year'?`
        <details class="finance-detail-section finance-year-detail" open>
          <summary>
            <div>
              <b>Tổng hợp 12 tháng</b>
              <span>Xem từng tháng trong năm ${esc(String(r.year))}</span>
            </div>
            <span class="finance-detail-chevron">▾</span>
          </summary>
  
          <div class="finance-detail-body">
            ${financeYearBreakdownHtml(r.year)}
          </div>
        </details>
      `:''}
  
      <div class="finance-detail-list section-gap">
        <details class="finance-detail-section">
          <summary>
            <div>
              <b>Chi tiết Thu/Chi</b>
              <span>
                ${cashflowInfo.list.length} khoản
                • Ròng ${cashflowNet>0?'+':''}${money(cashflowNet)}
              </span>
            </div>
            <span class="finance-detail-chevron">▾</span>
          </summary>
  
          <div class="finance-detail-body">
            ${cashflowInfo.list.length?`
              <div class="scroll">
                <table class="finance-cashflow-table">
                  <tr>
                    <th>Ngày</th>
                    <th>Loại</th>
                    <th>Nội dung</th>
                    <th>Ghi chú</th>
                    <th class="right">Số tiền</th>
                  </tr>
  
                  ${cashflowInfo.list
                    .sort((a,b)=>
                      String(b.date).localeCompare(String(a.date))
                    )
                    .map(x=>`
                      <tr>
                        <td>${formatVNDate(x.date)}</td>
                        <td>
                          <span class="cashflow-type ${x.type}">
                            ${x.type==='income'?'Thu':'Chi'}
                          </span>
                        </td>
                        <td><b>${esc(x.category)}</b></td>
                        <td>${esc(x.note||'')}</td>
                        <td class="right ${x.type==='income'?'profit':'neg'}">
                          <b>
                            ${x.type==='income'?'+':'−'}
                            ${money(x.amount)}
                          </b>
                        </td>
                      </tr>
                    `).join('')}
                </table>
              </div>
            `:'<div class="empty">Không có khoản Thu/Chi trong kỳ này.</div>'}
          </div>
        </details>
  
        <details class="finance-detail-section">
          <summary>
            <div>
              <b>Chênh lệch kiểm kê</b>
              <span>
                Thiếu ${money(stocktakeShortage)}
                • Thừa ${money(stocktakeSurplus)}
              </span>
            </div>
            <span class="finance-detail-chevron">▾</span>
          </summary>
  
          <div class="finance-detail-body">
            ${stocktakeInfo.receipts.length?`
              <div class="scroll">
                <table class="finance-stocktake-table">
                  <tr>
                    <th>Ngày</th>
                    <th>Số phiếu</th>
                    <th class="right">Mặt hàng</th>
                    <th class="right">Thiếu</th>
                    <th class="right">Thừa</th>
                    <th class="right">Ròng</th>
                  </tr>
  
                  ${stocktakeInfo.receipts.map(x=>`
                    <tr>
                      <td>${formatVNDate(x.date)}</td>
                      <td><b>${esc(x.receipt)}</b></td>
                      <td class="right">${num(x.itemCount)}</td>
                      <td class="right ${x.shortage>0?'neg':''}">
                        ${x.shortage>0?money(x.shortage):'—'}
                      </td>
                      <td class="right ${x.surplus>0?'profit':''}">
                        ${x.surplus>0?money(x.surplus):'—'}
                      </td>
                      <td class="right ${x.net<0?'neg':x.net>0?'profit':''}">
                        <b>${x.net>0?'+':''}${money(x.net)}</b>
                      </td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            `:'<div class="empty">Không có phiếu kiểm kê trong kỳ này.</div>'}
          </div>
        </details>
  
        <details class="finance-detail-section">
          <summary>
            <div>
              <b>Chi phí lương nhân viên</b>
              <span>
                ${salaryCostInfo.byEmployee.length} nhân viên
                • ${money(salaryCost)}
              </span>
            </div>
            <span class="finance-detail-chevron">▾</span>
          </summary>
  
          <div class="finance-detail-body">
            ${salaryCostInfo.byEmployee.length?`
              <div class="scroll">
                <table class="finance-salary-table">
                  <tr>
                    <th>Nhân viên</th>
                    <th class="right">Chi phí lương</th>
                  </tr>
  
                  ${salaryCostInfo.byEmployee
                    .sort((a,b)=>b.total-a.total)
                    .map(x=>`
                      <tr>
                        <td><b>${esc(x.name)}</b></td>
                        <td class="right">
                          <b>${money(x.total)}</b>
                        </td>
                      </tr>
                    `).join('')}
  
                  <tr class="finance-salary-total-row">
                    <td><b>Tổng</b></td>
                    <td class="right">
                      <b>${money(salaryCost)}</b>
                    </td>
                  </tr>
                </table>
              </div>
            `:'<div class="empty">Chưa có dữ liệu lương.</div>'}
          </div>
        </details>
  
        <details class="finance-detail-section">
          <summary>
            <div>
              <b>Hiệu quả theo món</b>
              <span>
                ${products.length} món
                • Lãi gộp ${money(grossProfit)}
                • Biên ${num(grossMargin)}%
              </span>
            </div>
            <span class="finance-detail-chevron">▾</span>
          </summary>
  
          <div class="finance-detail-body">
            ${products.length?`
              <div class="scroll">
                <table class="finance-product-table">
                  <tr>
                    <th>Món</th>
                    <th>Đơn vị</th>
                    <th class="right">SL bán</th>
                    <th class="right">Doanh thu</th>
                    <th class="right">Giá vốn</th>
                    <th class="right">Lãi gộp</th>
                    <th class="right">Biên lãi</th>
                  </tr>
  
                  ${products.map(x=>`
                    <tr>
                      <td><b>${esc(x.name)}</b></td>
                      <td>${esc(x.unit||'')}</td>
                      <td class="right">${num(x.qty)}</td>
                      <td class="right">${money(x.revenue)}</td>
                      <td class="right">${money(x.cogs)}</td>
                      <td class="right ${x.profit<0?'neg':'profit'}">
                        <b>${money(x.profit)}</b>
                      </td>
                      <td class="right">${num(x.margin)}%</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            `:'<div class="empty">Chưa có dữ liệu bán hàng trong kỳ này.</div>'}
          </div>
        </details>
      </div>
    `;
  
    scheduleIdleWork(
      'finance-trend-chart',
      ()=>drawFinanceTrend(sales,mode),
      300
    );
  }

  window.renderFinance=renderFinance;
  window.renderFinanceData=renderFinanceData;
  window.__lyFinanceModule={version:VERSION,render:renderFinance,renderData:renderFinanceData};
})();
