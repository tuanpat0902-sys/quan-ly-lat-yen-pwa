/* Lát Yên — Cashflow UI V1
   Extracted from Legacy index.html. Cashflow persistence/business rules remain in Legacy core. */
(()=>{
  'use strict';
  if(window.__lyCashflowModule)return;
  window.__lyCashflowModule={version:'2026.08.23.1'};

  function renderCashflow(){
    if(!E.cashflow)return;
  
    const modeValue=
      $('cashflowReportMode')?.value||
      'month';
  
    const dayValue=
      $('cashflowReportDay')?.value||
      todayLocalISO();
  
    const monthValue=
      $('cashflowReportMonth')?.value||
      currentMonthISO();
  
    const fromValue=
      $('cashflowReportFrom')?.value||
      todayLocalISO();
  
    const toValue=
      $('cashflowReportTo')?.value||
      todayLocalISO();
  
    const editing=
      cashflowEditId
        ?loadCashflow()
          .find(
            x=>x.id===cashflowEditId
          )
        :null;
  
    if(cashflowEditId && !editing){
      cashflowEditId='';
    }
  
    const formType=
      editing?.type||
      'expense';
  
    const formDate=
      editing?.date||
      todayLocalISO();
  
    const formCategory=
      editing?.category||
      '';
  
    const formAmount=
      Number(
        editing?.amount||0
      );
  
    const formNote=
      editing?.note||
      '';
  
    E.cashflow.innerHTML=`
      <div class="cashflow-page-head">
        <div>
          <h2>
            Thu/Chi — ${esc(warehouse()?.name||'')}
          </h2>
  
          <div class="muted">
            Quản lý các khoản thu và chi phí vận hành theo từng thời điểm.
          </div>
        </div>
  
        <button
          class="primary"
          onclick="toggleCashflowForm()"
        >
          + Tạo phiếu Thu/Chi
        </button>
      </div>
  
      ${cashflowFormOpen?`
        <div class="card cashflow-entry-card section-gap ${editing?'cashflow-editing':''}">
          <div class="cashflow-card-head">
            <div>
              <h3>
                ${editing
                  ?'Sửa phiếu Thu/Chi'
                  :'Tạo phiếu Thu/Chi'}
              </h3>
  
              <div class="muted">
                ${editing
                  ?'Chỉnh sửa thông tin giao dịch đã lưu.'
                  :'Nhập thông tin phát sinh và lưu vào lịch sử.'}
              </div>
            </div>
  
            <button
              class="secondary sm"
              onclick="toggleCashflowForm(false)"
            >Đóng</button>
          </div>
  
          ${editing?`
            <div class="cashflow-edit-note">
              <b>Đang sửa:</b>
              ${esc(editing.category)}
              • ${money(editing.amount)}
            </div>
          `:''}
  
          <div class="cashflow-entry-grid">
            <div>
              <label>Ngày</label>
  
              <input
                id="cashflowDate"
                type="date"
                value="${esc(formDate)}"
              >
            </div>
  
            <div>
              <label>Loại giao dịch</label>
  
              <select
                id="cashflowType"
                onchange="refreshCashflowCategoryOptions()"
              >
                <option
                  value="income"
                  ${formType==='income'?'selected':''}
                >Thu</option>
  
                <option
                  value="expense"
                  ${formType==='expense'?'selected':''}
                >Chi</option>
              </select>
            </div>
  
            <div>
              <label>Nhóm nội dung</label>
  
              <select id="cashflowCategory">
                ${cashflowCategoryOptions(
                  formType,
                  formCategory
                )}
              </select>
            </div>
  
            <div>
              <label>Số tiền</label>
  
              <input
                id="cashflowAmount"
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value="${editing?formAmount:''}"
              >
            </div>
  
            <div class="cashflow-entry-note">
              <label>Ghi chú</label>
  
              <input
                id="cashflowNote"
                placeholder="Diễn giải chi tiết..."
                value="${esc(formNote)}"
              >
            </div>
          </div>
  
          <div class="cashflow-form-actions">
            <button
              class="secondary"
              onclick="toggleCashflowForm(false)"
            >Hủy</button>
  
            <button
              class="primary"
              onclick="addCashflowEntry()"
            >
              ${editing
                ?'Lưu thay đổi'
                :'Lưu phiếu'}
            </button>
          </div>
        </div>
      `:''}
  
      <div class="card section-gap cashflow-report-card">
        <div class="cashflow-card-head">
          <div>
            <h3>Báo cáo Thu/Chi</h3>
  
            <div class="muted">
              Lọc số liệu theo ngày, tháng hoặc khoảng thời gian.
            </div>
          </div>
        </div>
  
        <div class="cashflow-filter-row">
          <div>
            <label>Chế độ xem</label>
  
            <select
              id="cashflowReportMode"
              onchange="renderCashflowReport()"
            >
              <option
                value="day"
                ${modeValue==='day'?'selected':''}
              >Theo ngày</option>
  
              <option
                value="month"
                ${modeValue==='month'?'selected':''}
              >Theo tháng</option>
  
              <option
                value="range"
                ${modeValue==='range'?'selected':''}
              >Khoảng thời gian</option>
            </select>
          </div>
  
          <div
            id="cashflowReportDayBox"
            style="${modeValue==='day'?'':'display:none'}"
          >
            <label>Ngày</label>
  
            <input
              id="cashflowReportDay"
              type="date"
              value="${dayValue}"
              onchange="renderCashflowReport()"
            >
          </div>
  
          <div
            id="cashflowReportMonthBox"
            style="${modeValue==='month'?'':'display:none'}"
          >
            <label>Tháng</label>
  
            <input
              id="cashflowReportMonth"
              type="month"
              value="${monthValue}"
              onchange="renderCashflowReport()"
            >
          </div>
  
          <div
            id="cashflowReportRangeBox"
            class="cashflow-range-filter"
            style="${modeValue==='range'?'':'display:none'}"
          >
            <div>
              <label>Từ ngày</label>
  
              <input
                id="cashflowReportFrom"
                type="date"
                value="${fromValue}"
              >
            </div>
  
            <div>
              <label>Đến ngày</label>
  
              <input
                id="cashflowReportTo"
                type="date"
                value="${toValue}"
              >
            </div>
  
            <button
              class="primary"
              onclick="renderCashflowReport()"
            >Xem</button>
          </div>
        </div>
  
        <div
          id="cashflowReportArea"
          class="section-gap"
        ></div>
      </div>
    `;
  
    setTimeout(
      ()=>renderCashflowReport(),
      0
    );
  }
  
  function renderCashflowReport(){
    const area=$('cashflowReportArea');
    if(!area)return;
  
    const mode=$('cashflowReportMode')?.value||'month';
    if($('cashflowReportDayBox'))$('cashflowReportDayBox').style.display=mode==='day'?'block':'none';
    if($('cashflowReportMonthBox'))$('cashflowReportMonthBox').style.display=mode==='month'?'block':'none';
    if($('cashflowReportRangeBox'))$('cashflowReportRangeBox').style.display=mode==='range'?'grid':'none';
  
    const range=cashflowRange();
    if(range.start>range.end){
      area.innerHTML='<div class="warnbox">Từ ngày không được lớn hơn đến ngày.</div>';
      return;
    }
  
    const list=cashflowFilteredList();
    const income=list.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount||0),0);
    const expense=list.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0);
    const balance=income-expense;
  
    const byCategory={};
    for(const x of list){
      const key=`${x.type}|${x.category}`;
      if(!byCategory[key])byCategory[key]={type:x.type,category:x.category,total:0,count:0};
      byCategory[key].total+=Number(x.amount||0);
      byCategory[key].count++;
    }
    const categories=Object.values(byCategory).sort((a,b)=>b.total-a.total);
  
    area.innerHTML=`
      <div class="cashflow-period-label">${esc(range.label)}</div>
  
      <div class="cashflow-summary">
        <div class="cashflow-kpi income">
          <span>Tổng thu</span>
          <b>${money(income)}</b>
          <small>${num(list.filter(x=>x.type==='income').length)} khoản</small>
        </div>
        <div class="cashflow-kpi expense">
          <span>Tổng chi</span>
          <b>${money(expense)}</b>
          <small>${num(list.filter(x=>x.type==='expense').length)} khoản</small>
        </div>
        <div class="cashflow-kpi balance">
          <span>Chênh lệch Thu − Chi</span>
          <b class="${balance<0?'neg':'profit'}">${money(balance)}</b>
          <small>${balance>=0?'Dương':'Âm'}</small>
        </div>
      </div>
  
      <div class="cashflow-report-grid section-gap">
        <div class="card cashflow-inner-card">
          <h3>Phân loại Thu/Chi</h3>
          ${categories.length?`
            <table>
              <tr><th>Nhóm</th><th>Loại</th><th class="right">Số tiền</th></tr>
              ${categories.map(x=>`
                <tr>
                  <td><b>${esc(x.category)}</b></td>
                  <td><span class="cashflow-type ${x.type}">${x.type==='income'?'Thu':'Chi'}</span></td>
                  <td class="right"><b>${money(x.total)}</b></td>
                </tr>
              `).join('')}
            </table>
          `:'<div class="empty">Chưa có dữ liệu.</div>'}
        </div>
  
        <div class="card cashflow-inner-card">
          <h3>Tỷ lệ chi phí</h3>
          ${expense>0?`
            <div class="cashflow-category-list">
              ${categories.filter(x=>x.type==='expense').map(x=>`
                <div>
                  <span>${esc(x.category)}</span>
                  <b>${num(x.total/expense*100)}%</b>
                </div>
              `).join('')}
            </div>
          `:'<div class="empty">Chưa có khoản chi.</div>'}
        </div>
      </div>
  
      <div class="card section-gap cashflow-inner-card">
        <h3>Lịch sử Thu/Chi</h3>
        ${list.length?`
        <div class="scroll">
          <table class="cashflow-table">
            <tr>
              <th>Ngày</th>
              <th>Loại</th>
              <th>Nội dung</th>
              <th>Ghi chú</th>
              <th class="right">Số tiền</th>
              <th></th>
            </tr>
            ${list.map(x=>`
              <tr>
                <td>${formatVNDate(x.date)}</td>
                <td><span class="cashflow-type ${x.type}">${x.type==='income'?'Thu':'Chi'}</span></td>
                <td><b>${esc(x.category)}</b></td>
                <td>${esc(x.note||'')}</td>
                <td class="right ${x.type==='income'?'profit':'neg'}">
                  <b>${x.type==='income'?'+':'−'} ${money(x.amount)}</b>
                </td>
                <td class="right">
                  <div class="cashflow-history-actions">
                    <button
                      class="secondary sm"
                      onclick="editCashflowEntry('${x.id}')"
                    >Sửa</button>
  
                    <button
                      class="danger sm"
                      onclick="deleteCashflowEntry('${x.id}')"
                    >Xóa</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </table>
        </div>
        `:'<div class="empty">Chưa có khoản thu/chi nào trong kỳ.</div>'}
      </div>
    `;
  }
  
  const INVENTORY_PAYMENT_CASHFLOW_CATEGORY=
    'Thanh toán Nhập kho (không tính P&L)';

  window.__lyCashflowModule.renderCashflow=renderCashflow;
  window.__lyCashflowModule.renderCashflowReport=renderCashflowReport;
})();
