/* Lát Yên — Employee Reports UI V1
   Employee attendance/payroll/report renderers extracted from Legacy index.html. Data, payroll rules and action helpers remain resident. */
(()=>{
  'use strict';
  if(window.__lyEmployeeReportsModule)return;
  function renderEmployeePayrollTable(month=defaultPayrollMonth()){
    const area=$('employeePayrollArea');
    if(!area)return;
  
    const list=loadEmployees().filter(e=>e.active!==false);
    const totals=list.reduce((sum,e)=>sum+employeeMonthlySalary(e,month).total,0);
  
    area.innerHTML=`
      <div class="employee-payroll-summary">
        <div><span>Nhân viên tính lương</span><b>${num(list.length)}</b></div>
        <div><span>Quỹ lương dự kiến</span><b>${money(totals)}</b></div>
        <div><span>Tháng lương</span><b>${esc(month.split('-').reverse().join('/'))}</b></div>
      </div>
  
      ${list.length?`
        <div class="scroll section-gap">
          <table class="payroll-table">
            <tr>
              <th>Nhân viên</th>
              <th class="right">Lương cơ bản</th>
              <th class="right">Công chuẩn</th>
              <th class="right">Ngày công</th>
              <th class="right">Nghỉ</th>
              <th class="right">Giờ PT</th>
              <th class="right">OT (giờ)</th>
              <th class="right">Phụ cấp</th>
              <th class="right">Thưởng</th>
              <th class="right">Khấu trừ</th>
              <th class="right">Thực nhận</th>
              <th>Ghi chú</th>
              <th></th>
            </tr>
            ${list.map(e=>{
              const r=employeeMonthlySalary(e,month);
              return `
                <tr data-payroll-employee="${e.id}">
                  <td>
                    <b>${esc(e.name)}</b>
                    <div class="muted">${esc(e.role||'')}</div>
                  </td>
                  <td class="right">${money(e.base_salary||0)}</td>
                  <td class="right">${num(e.standard_days||26)}</td>
                  <td><input class="payWorkDays payroll-input" type="number" min="0" step="0.5" value="${r.work_days||0}" oninput="previewPayrollRow(this.closest('tr'),'${e.id}','${month}')"></td>
                  <td><input class="payLeaveDays payroll-input" type="number" min="0" step="0.5" value="${r.leave_days||0}"></td>
                  <td><input class="payPartHours payroll-input" type="number" min="0" step="0.25" value="${r.parttime_hours||0}" oninput="previewPayrollRow(this.closest('tr'),'${e.id}','${month}')"></td>
                  <td><input class="payOtHours payroll-input" type="number" min="0" step="0.5" value="${r.overtime_hours||0}" oninput="previewPayrollRow(this.closest('tr'),'${e.id}','${month}')"></td>
                  <td><input class="payAllowance payroll-money-input" type="number" min="0" value="${r.allowance||0}" oninput="previewPayrollRow(this.closest('tr'),'${e.id}','${month}')"></td>
                  <td><input class="payBonus payroll-money-input" type="number" min="0" value="${r.bonus||0}" oninput="previewPayrollRow(this.closest('tr'),'${e.id}','${month}')"></td>
                  <td><input class="payDeduction payroll-money-input" type="number" min="0" value="${r.deduction||0}" oninput="previewPayrollRow(this.closest('tr'),'${e.id}','${month}')"></td>
                  <td class="right payroll-total"><b>${money(r.total)}</b></td>
                  <td><input class="payNote payroll-note" value="${esc(r.note||'')}" placeholder="Ghi chú"></td>
                  <td><button class="secondary sm" onclick="savePayrollRow('${e.id}','${month}')">Lưu</button></td>
                </tr>`;
            }).join('')}
          </table>
        </div>
  
        <div class="employee-payroll-actions">
          <button class="primary" onclick="saveAllPayroll()">Lưu toàn bộ bảng lương</button>
        </div>
      `:'<div class="empty section-gap">Chưa có nhân viên đang làm việc.</div>'}
    `;
  }

  function renderEmployeeAttendance(){
    const area=$('employeeAttendanceArea');
    if(!area)return;
  
    const month=$('employeeAttendanceMonth')?.value||defaultPayrollMonth();
    const list=loadEmployees().filter(e=>e.active!==false);
  
    if(!currentAttendanceEmployeeId){
      area.innerHTML='';
      return;
    }
  
    const e=list.find(x=>x.id===currentAttendanceEmployeeId);
    if(!e){
      currentAttendanceEmployeeId='';
      area.innerHTML='<div class="empty">Không tìm thấy nhân viên.</div>';
      return;
    }
  
    area.innerHTML=attendanceEmployeeDetailHtml(e.id,month);
  }

  function renderEmployeeReport(){
    const area=$('employeeReportArea');
    if(!area)return;
  
    const mode=$('employeeReportMode')?.value||'month';
    if($('employeeReportDayBox'))$('employeeReportDayBox').style.display=mode==='day'?'block':'none';
    if($('employeeReportMonthBox'))$('employeeReportMonthBox').style.display=mode==='month'?'block':'none';
    if($('employeeReportRangeBox'))$('employeeReportRangeBox').style.display=mode==='range'?'grid':'none';
  
    const range=employeeReportRange();
    if(range.start>range.end){
      area.innerHTML='<div class="warnbox">Từ ngày không được lớn hơn đến ngày.</div>';
      return;
    }
  
    const list=loadEmployees();
    const rows=list.map(e=>{
      const s=estimatedEmployeeCostForRange(e,range.start,range.end);
      return {employee:e,...s};
    });
  
    const activeRows=rows.filter(x=>
      x.workDays>0||x.hours>0||x.overtime>0||x.leaveDays>0||x.absentDays>0
    );
  
    const totals=activeRows.reduce((a,x)=>({
      workDays:a.workDays+x.workDays,
      hours:a.hours+x.hours,
      overtime:a.overtime+x.overtime,
      leave:a.leave+x.leaveDays,
      absent:a.absent+x.absentDays,
      estimated:a.estimated+x.estimated
    }),{workDays:0,hours:0,overtime:0,leave:0,absent:0,estimated:0});
  
    const mostWorked=[...activeRows].sort((a,b)=>
      (b.workDays*8+b.hours+b.overtime)-(a.workDays*8+a.hours+a.overtime)
    )[0];
  
    area.innerHTML=`
      <div class="employee-report-kpis">
        <div><span>Nhân viên có phát sinh</span><b>${num(activeRows.length)}</b></div>
        <div><span>Tổng ngày công</span><b>${num(totals.workDays)}</b></div>
        <div><span>Tổng giờ Theo giờ</span><b>${num(totals.hours)}</b></div>
        <div><span>Tổng giờ OT</span><b>${num(totals.overtime)}</b></div>
        <div><span>Tổng ngày nghỉ</span><b>${num(totals.leave+totals.absent)}</b></div>
        <div><span>Chi phí lương ước tính</span><b>${money(totals.estimated)}</b></div>
      </div>
  
      <div class="employee-report-highlight section-gap">
        <div>
          <span>Kỳ báo cáo</span>
          <b>${esc(range.label)}</b>
        </div>
        <div>
          <span>Nhân viên làm nhiều nhất</span>
          <b>${mostWorked?esc(mostWorked.employee.name):'—'}</b>
        </div>
      </div>
  
      <div class="card section-gap">
        <h3>Báo cáo chi tiết nhân viên</h3>
        ${activeRows.length?`
          <div class="scroll section-gap">
            <table class="employee-report-table">
              <tr>
                <th>Mã NV</th>
                <th>Nhân viên</th>
                <th>Loại</th>
                <th class="right">Ngày công</th>
                <th class="right">Giờ làm</th>
                <th class="right">OT</th>
                <th class="right">Nghỉ phép</th>
                <th class="right">Nghỉ KP</th>
                <th class="right">Lương ước tính</th>
              </tr>
              ${activeRows.map(x=>{
                const mode=employeeWorkMode(x.employee);
                return `
                  <tr>
                    <td>${esc(x.employee.code||'—')}</td>
                    <td>
                      <b>${esc(x.employee.name)}</b>
                      <div class="muted">${esc(x.employee.role||'')}</div>
                    </td>
                    <td>${mode==='fulltime'?'Theo ngày':mode==='parttime'?'Theo giờ':'Theo giờ'}</td>
                    <td class="right">${num(x.workDays)}</td>
                    <td class="right">${num(x.hours)}</td>
                    <td class="right">${num(x.overtime)}</td>
                    <td class="right">${num(x.leaveDays)}</td>
                    <td class="right">${num(x.absentDays)}</td>
                    <td class="right"><b>${money(x.estimated)}</b></td>
                  </tr>`;
              }).join('')}
            </table>
          </div>
        `:'<div class="empty section-gap">Không có dữ liệu chấm công trong kỳ đã chọn.</div>'}
      </div>
  
      <div class="card section-gap">
        <h3>Biểu đồ thời lượng làm việc</h3>
        <canvas id="employeeWorkChart"></canvas>
      </div>
    `;
  
    scheduleIdleWork(
      'employee-work-chart',
      ()=>drawEmployeeWorkChart(activeRows),
      300
    );
  }

  function renderEmployeeSalaryReport(){
    const area=$('employeeSalaryReportArea');
    if(!area)return;
  
    const month=
      $('employeeSalaryReportMonth')?.value||
      defaultPayrollMonth();
  
    const list=loadEmployees().filter(
      e=>e.active!==false
    );
  
    const rows=list.map(e=>{
      const setting=salaryReportSetting(e.id,month);
  
      const attendanceSalary=Math.max(
        0,
        Number(employeeMonthlySalary(e,month).total||0)
      );
  
      const salary=
        setting.source==='direct'
          ?Math.max(0,Number(setting.direct_salary||0))
          :attendanceSalary;
  
      return {
        employee:e,
        setting,
        salary,
        attendanceSalary
      };
    });
  
    const total=rows.reduce(
      (sum,x)=>sum+x.salary,
      0
    );
  
    area.innerHTML=`
      <div class="salary-report-summary">
        <span>
          Tổng lương tháng
          ${esc(month.split('-').reverse().join('/'))}
        </span>
        <b>${money(total)}</b>
      </div>
  
      ${rows.length?`
        <div class="salary-report-table-wrap section-gap">
          <div class="scroll salary-report-scroll">
            <table class="salary-report-table">
              <tr>
                <th class="salary-col-stt">STT</th>
                <th class="salary-col-name">Tên nhân viên</th>
                <th class="salary-col-source">Nguồn lương</th>
                <th class="right salary-col-value">Lương</th>
              </tr>
  
              ${rows.map((x,index)=>`
                <tr data-salary-report-employee="${x.employee.id}">
                  <td class="salary-report-stt">${index+1}</td>
  
                  <td class="salary-report-name">
                    <b>${esc(x.employee.name)}</b>
                  </td>
  
                  <td>
                    <select
                      class="salarySource"
                      onchange="toggleSalaryReportSource(this,'${x.employee.id}','${month}')"
                    >
                      <option value="attendance" ${x.setting.source!=='direct'?'selected':''}>Lấy từ chấm công</option>
                      <option value="direct" ${x.setting.source==='direct'?'selected':''}>Nhập trực tiếp</option>
                    </select>
                  </td>
  
                  <td class="right">
                    <div class="salary-value-wrap">
                      <span
                        class="salaryAttendanceValue"
                        style="${x.setting.source==='direct'?'display:none':''}"
                      >
                        <b>${money(x.attendanceSalary)}</b>
                      </span>
  
                      <input
                        class="salaryDirectValue"
                        type="number"
                        min="0"
                        step="1000"
                        value="${Number(x.setting.direct_salary||0)}"
                        style="${x.setting.source==='direct'?'':'display:none'}"
                        oninput="previewSalaryReportDirect('${x.employee.id}','${month}')"
                      >
                    </div>
                  </td>
                </tr>
              `).join('')}
            </table>
          </div>
  
          <div class="employee-payroll-actions salary-report-actions">
            <button
              class="primary"
              onclick="saveEmployeeSalaryReport()"
            >Lưu báo cáo lương</button>
          </div>
        </div>
      `:'<div class="empty section-gap">Chưa có nhân viên đang làm việc.</div>'}
    `;
  }

  window.renderEmployeePayrollTable=renderEmployeePayrollTable;
  window.renderEmployeeAttendance=renderEmployeeAttendance;
  window.renderEmployeeReport=renderEmployeeReport;
  window.renderEmployeeSalaryReport=renderEmployeeSalaryReport;
  window.__lyEmployeeReportsModule={version:'2026.08.23.1'};
})();
