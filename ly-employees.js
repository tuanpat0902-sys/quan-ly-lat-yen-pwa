/* Lát Yên — Employees UI V1
   Extracted from Legacy index.html. Employee data/payroll logic remains in Legacy core. */
(()=>{
  'use strict';
  if(window.__lyEmployeesUIV1)return;
  window.__lyEmployeesUIV1=true;
  const VERSION='2026.08.25.4';
  if(!document.getElementById?.('lyEmployeeLayoutStyles')){const style=document.createElement('style');style.id='lyEmployeeLayoutStyles';style.textContent=`.employee-salary-chart-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:stretch;gap:12px}.employee-salary-chart-grid>.card{margin-top:0!important;min-width:0;padding:14px!important}.employee-salary-chart-grid .employee-section-head{min-height:56px;align-items:flex-start}.employee-salary-chart-grid .employee-section-head h3{font-size:var(--ly-font-md,14px)!important}.employee-salary-chart-grid .muted{font-size:var(--ly-font-sm,11px)!important}.employee-salary-card .salary-report-table-wrap,.employee-salary-card .salary-report-scroll,.employee-salary-card .salary-report-actions{width:100%!important;max-width:none!important}.employee-salary-card .salary-report-scroll{overflow-x:hidden!important}.employee-salary-card .salary-report-table{width:100%!important;min-width:0!important;max-width:none!important;table-layout:fixed!important;font-size:var(--ly-font-base,12px)!important}.employee-salary-card .salary-report-table th{font-size:var(--ly-font-sm,11px)!important}.employee-work-chart-card{overflow:hidden}.employee-work-chart-card canvas{display:block;max-width:100%!important;margin-top:6px}@media(max-width:1180px){.employee-salary-chart-grid{grid-template-columns:1fr}}@media(max-width:700px){.employee-salary-chart-grid{gap:8px}.employee-salary-chart-grid>.card{padding:10px!important}.employee-salary-chart-grid .employee-section-head{display:grid;grid-template-columns:minmax(0,1fr) 142px;gap:8px;min-height:0}.employee-work-chart-card .employee-section-head{grid-template-columns:1fr}.employee-salary-card .salary-report-table th,.employee-salary-card .salary-report-table td{height:36px!important;padding:5px 4px!important}.employee-salary-card .salary-report-table th:nth-child(1),.employee-salary-card .salary-report-table td:nth-child(1){display:none}.employee-salary-card .salary-report-table th:nth-child(2),.employee-salary-card .salary-report-table td:nth-child(2){width:31%!important;max-width:none!important}.employee-salary-card .salary-report-table th:nth-child(3),.employee-salary-card .salary-report-table td:nth-child(3){width:39%!important;max-width:none!important}.employee-salary-card .salary-report-table th:nth-child(4),.employee-salary-card .salary-report-table td:nth-child(4){width:30%!important;max-width:none!important}.employee-salary-card .salarySource{height:32px!important;min-height:32px!important;padding:3px 4px!important;font-size:10px!important}.employee-salary-card .salary-value-wrap{min-width:0}.employee-salary-card .salaryAttendanceValue{font-size:10.5px!important}.employee-salary-card .salaryDirectValue{width:100%!important;max-width:100%!important}.employee-salary-card .salary-report-actions .primary{width:100%;min-height:36px!important;height:36px!important}.employee-work-chart-card canvas{margin-top:2px}}@media(max-width:420px){.employee-salary-chart-grid .employee-section-head{grid-template-columns:1fr}.employee-salary-card .salary-report-table th:nth-child(2),.employee-salary-card .salary-report-table td:nth-child(2){width:30%!important}.employee-salary-card .salary-report-table th:nth-child(3),.employee-salary-card .salary-report-table td:nth-child(3){width:40%!important}}`;document.head.appendChild(style);}

  function renderEmployees(){
    if(!E.employees)return;
    bindEmployeeActions();
    const list=loadEmployees();
    const active=list.filter(e=>e.active!==false);
    const month=defaultPayrollMonth();
    const payrollTotal=active.reduce((sum,e)=>sum+employeeMonthlySalary(e,month).total,0);
  
    E.employees.innerHTML=`
      <div class="employee-module-head">
        <div>
          <h2>Quản lý nhân viên</h2>
          <div class="muted">Hồ sơ nhân sự, trạng thái làm việc, chấm công và bảng lương hàng tháng.</div>
        </div>
        <button class="primary" onclick="employeeModal()">+ Thêm nhân viên</button>
      </div>
  
      <div class="employee-kpi-grid">
        <div class="employee-kpi"><span>Tổng nhân viên</span><b>${num(list.length)}</b></div>
        <div class="employee-kpi"><span>Đang làm việc</span><b>${num(active.length)}</b></div>
        <div class="employee-kpi"><span>Đã nghỉ</span><b>${num(list.length-active.length)}</b></div>
        <div class="employee-kpi"><span>Quỹ lương tháng hiện tại</span><b>${money(payrollTotal)}</b></div>
      </div>
  
      <div class="card section-gap">
        <div class="employee-section-head">
          <div>
            <h3>Danh sách nhân viên</h3>
            <div class="muted">Thông tin nhân sự thuộc ${esc(warehouse()?.name||'kho hiện tại')}.</div>
          </div>
        </div>
  
        ${list.length?`
          <div class="scroll section-gap">
            <table class="employee-list-table" data-ly-table-view="employees">
              <tr>
                <th>Mã NV</th>
                <th>Họ tên</th>
                <th>Chức vụ</th>
                <th>Điện thoại</th>
                <th>Ngày vào làm</th>
                <th>Ca làm</th>
                <th>Chấm công</th>
                <th class="right">Lương cơ bản</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
              ${list.map(e=>`
                <tr class="employee-list-row">
                  <td>${esc(e.code||'—')}</td>
                  <td>
                    <button type="button" class="employee-name-link" onclick="openEmployeeAttendance('${e.id}');return false;">${esc(e.name)}</button>
                    ${e.bank_account?`<div class="muted">TK: ${esc(e.bank_account)}</div>`:''}
                  </td>
                  <td>${esc(e.role||'')}</td>
                  <td>${esc(e.phone||'')}</td>
                  <td>${e.hire_date?formatVNDate(e.hire_date):'—'}</td>
                  <td>${esc(e.shift||'')}</td>
                  <td>${employeeWorkMode(e)==='day'?'Theo ngày':'Theo giờ'}</td>
                  <td class="right">${money(e.base_salary||0)}</td>
                  <td>${e.active!==false?'<span class="badge okb">Đang làm</span>':'<span class="badge">Đã nghỉ</span>'}</td>
                  <td class="right employee-row-actions">
                    <button type="button" class="secondary sm js-employee-edit" data-employee-id="${esc(e.id)}">Sửa</button>
                  </td>
                </tr>
              `).join('')}
            </table>
          </div>
        `:'<div class="empty section-gap">Chưa có nhân viên</div>'}
      </div>
  
      ${currentAttendanceEmployeeId?`
      <div class="card section-gap employee-attendance-open-card">
        <div class="employee-section-head payroll-section-head">
          <div>
            <h3>Chấm công nhân viên</h3>
            <div class="muted">Chi tiết chấm công của nhân viên đang chọn từ danh sách phía trên.</div>
          </div>
          <div class="attendance-filter-group">
            <div>
              <label>Tháng</label>
              <input id="employeeAttendanceMonth" type="month" value="${month}" onchange="renderEmployeeAttendance()">
            </div>
            <button class="secondary" onclick="currentAttendanceEmployeeId='';renderEmployees()">Đóng</button>
          </div>
        </div>
        <div id="employeeAttendanceArea"></div>
      </div>
      `:''}
      <div class="employee-salary-chart-grid section-gap">
        <div class="card employee-salary-card">
          <div class="employee-section-head">
            <div>
              <h3>Báo cáo lương nhân viên</h3>
              <div class="muted">Chỉ hiển thị tên và lương; lương có thể lấy từ chấm công hoặc nhập trực tiếp.</div>
            </div>
            <div>
              <label>Tháng lương</label>
              <input id="employeeSalaryReportMonth" type="month" value="${month}" onchange="renderEmployeeSalaryReport()">
            </div>
          </div>

          <div id="employeeSalaryReportArea" class="section-gap"></div>
        </div>

        <div class="card employee-work-chart-card">
          <div class="employee-section-head">
            <div>
              <h3>Biểu đồ thời lượng làm việc</h3>
              <div id="employeeWorkChartPeriod" class="muted">Theo kỳ báo cáo nhân sự đang chọn.</div>
            </div>
          </div>
          <canvas id="employeeWorkChart" aria-label="Biểu đồ thời lượng làm việc của nhân viên"></canvas>
        </div>
      </div>
  
      <div class="card section-gap">
        <div class="employee-section-head">
          <div>
            <h3>Báo cáo nhân sự</h3>
            <div class="muted">Phân tích chấm công và chi phí nhân sự theo ngày, tháng hoặc khoảng thời gian.</div>
          </div>
        </div>
  
        <div class="employee-report-filter section-gap">
          <div>
            <label>Chế độ xem</label>
            <select id="employeeReportMode" onchange="renderEmployeeReport()">
              <option value="day">Theo ngày</option>
              <option value="month" selected>Theo tháng</option>
              <option value="range">Khoảng thời gian</option>
            </select>
          </div>
  
          <div id="employeeReportDayBox" style="display:none">
            <label>Ngày</label>
            <input id="employeeReportDay" type="date" value="${todayLocalISO()}" onchange="renderEmployeeReport()">
          </div>
  
          <div id="employeeReportMonthBox">
            <label>Tháng</label>
            <input id="employeeReportMonth" type="month" value="${month}" onchange="renderEmployeeReport()">
          </div>
  
          <div id="employeeReportRangeBox" class="employee-report-range" style="display:none">
            <div>
              <label>Từ ngày</label>
              <input id="employeeReportFrom" type="date" value="${employeeReportDefaultFromDate()}">
            </div>
            <div>
              <label>Đến ngày</label>
              <input id="employeeReportTo" type="date" value="${todayLocalISO()}">
            </div>
            <button type="button" class="primary employee-report-apply" onclick="renderEmployeeReport()">Xem báo cáo</button>
          </div>
        </div>
  
        <div class="employee-report-quick-ranges">
          <button type="button" class="secondary sm" onclick="setEmployeeReportQuickRange('today')">Hôm nay</button>
          <button type="button" class="secondary sm" onclick="setEmployeeReportQuickRange('7d')">7 ngày</button>
          <button type="button" class="secondary sm" onclick="setEmployeeReportQuickRange('30d')">30 ngày</button>
          <button type="button" class="secondary sm" onclick="setEmployeeReportQuickRange('month')">Tháng này</button>
        </div>
  
        <div id="employeeReportArea" class="section-gap"></div>
      </div>
  
      <div class="card section-gap">
        <h3>Nội dung quản trị nhân sự</h3>
        <div class="employee-admin-grid">
          <div>
            <b>Hồ sơ nhân sự</b>
            <span>Lưu mã nhân viên, liên hệ, chức vụ, ngày vào làm, tài khoản ngân hàng và ghi chú.</span>
          </div>
          <div>
            <b>Chấm công</b>
            <span>Theo dõi ngày công, ngày nghỉ và giờ tăng ca theo từng tháng.</span>
          </div>
          <div>
            <b>Lương & phụ cấp</b>
            <span>Tự tính lương theo công chuẩn, phụ cấp, thưởng và các khoản khấu trừ.</span>
          </div>
          <div>
            <b>Trạng thái nhân sự</b>
            <span>Quản lý nhân viên đang làm hoặc đã nghỉ, tách riêng theo từng kho/chi nhánh.</span>
          </div>
        </div>
      </div>
    `;
  
    (window.queueMicrotask||window.setTimeout)?.(()=>window.__lyTableViewV2?.apply?.(E.employees),0);
    requestAnimationFrame(()=>{
      if(activePanelId!=='employees')return;
  
      renderEmployeeAttendance();
      renderEmployeeSalaryReport();
  
      scheduleIdleWork(
        'employee-report',
        ()=>{
          if(activePanelId==='employees'){
            renderEmployeeReport();
          }
        },
        450
      );
    });
  }

  window.renderEmployees=renderEmployees;
  window.__lyEmployeesModule={version:VERSION,render:renderEmployees};
})();
