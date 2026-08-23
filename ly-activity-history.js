/* Lát Yên — Activity History UI V1
   Extracted from Legacy index.html. Audit persistence remains in Legacy core. */
(()=>{
  'use strict';
  if(window.__lyActivityHistoryUIV1)return;
  window.__lyActivityHistoryUIV1=true;
  const VERSION='2026.08.23.1';

  function auditActionClass(action){
    const a=String(action||'').toLowerCase();
    if(a.includes('xóa'))return 'audit-delete';
    if(a.includes('thêm')||a.includes('tạo')||a.includes('nhập')||a.includes('bán'))return 'audit-create';
    if(a.includes('sửa')||a.includes('cập nhật')||a.includes('lưu'))return 'audit-update';
    return 'audit-neutral';
  }

  function auditFilterRows(){
    const module=$('historyModuleFilter')?.value||'all';
    const query=($('historySearch')?.value||'').trim().toLowerCase();
    const start=$('historyFrom')?.value||'';
    const end=$('historyTo')?.value||'';
  
    return loadAuditLog().filter(x=>{
      if(x.warehouse_id && x.warehouse_id!==currentWarehouseId)return false;
      if(module!=='all'&&x.module!==module)return false;
      const date=String(x.created_at||'').slice(0,10);
      if(start&&date<start)return false;
      if(end&&date>end)return false;
      if(query){
        const hay=`${x.module} ${x.action} ${x.summary} ${x.details}`.toLowerCase();
        if(!hay.includes(query))return false;
      }
      return true;
    });
  }

  function renderHistory(){
    if(!E.history)return;
  
    const allAuditRows=auditFilterRows();
    const auditRows=allAuditRows.slice(0,300);
    const modules=[...new Set(loadAuditLog()
      .filter(x=>!x.warehouse_id||x.warehouse_id===currentWarehouseId)
      .map(x=>x.module)
      .filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,'vi'));
  
    const legacyMovements=(db.movements||[])
      .filter(m=>m.warehouse_id===currentWarehouseId)
      .slice(0,300);
  
    E.history.innerHTML=`
      <div class="history-head">
        <div>
          <h2>Lịch sử hoạt động — ${esc(warehouse()?.name||'')}</h2>
          <div class="muted">Theo dõi toàn bộ thay đổi được thực hiện trong phần mềm.</div>
        </div>
        <div class="history-count">${num(allAuditRows.length)} hoạt động</div>
      </div>
  
      <div class="card section-gap">
        <div class="history-filter-grid">
          <div>
            <label>Khu vực</label>
            <select id="historyModuleFilter" onchange="renderHistory()">
              <option value="all">Tất cả</option>
              ${modules.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Từ ngày</label>
            <input id="historyFrom" type="date" onchange="renderHistory()">
          </div>
          <div>
            <label>Đến ngày</label>
            <input id="historyTo" type="date" onchange="renderHistory()">
          </div>
          <div class="history-search-box">
            <label>Tìm kiếm</label>
            <input id="historySearch" placeholder="Tên, hành động, nội dung..." oninput="debouncedHistoryRender()">
          </div>
        </div>
      </div>
  
      <div class="card section-gap">
        <h3>Nhật ký thay đổi</h3>
        ${auditRows.length?`
          ${allAuditRows.length>300?`<div class="history-limit-note">Đang hiển thị 300 hoạt động gần nhất trong ${num(allAuditRows.length)} kết quả.</div>`:''}
          <div class="scroll">
            <table class="audit-table">
              <tr>
                <th>Thời gian</th>
                <th>Khu vực</th>
                <th>Hành động</th>
                <th>Nội dung</th>
                <th>Chi tiết</th>
              </tr>
              ${auditRows.map(x=>`
                <tr>
                  <td class="audit-time">${dt(x.created_at)}</td>
                  <td><span class="audit-module">${esc(x.module)}</span></td>
                  <td><span class="audit-action ${auditActionClass(x.action)}">${esc(x.action)}</span></td>
                  <td><b>${esc(x.summary)}</b></td>
                  <td>${esc(x.details||'')}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        `:'<div class="empty">Chưa có hoạt động được ghi nhận. Các thay đổi mới từ phiên bản này sẽ xuất hiện tại đây.</div>'}
      </div>
  
      <div class="card section-gap">
        <details>
          <summary><b>Biến động kho trước đây</b> <span class="muted">(${num(legacyMovements.length)} dòng)</span></summary>
          <div class="section-gap">
            ${legacyMovements.length?`
              <div class="scroll">
                <table>
                  <tr><th>Thời gian</th><th>Loại</th><th>Nguyên liệu/ Dụng cụ</th><th class="right">SL</th><th>Ghi chú</th></tr>
                  ${legacyMovements.map(m=>{
                    const i=db.ingredients.find(x=>x.id===m.ingredient_id);
                    return `<tr>
                      <td>${dt(m.created_at)}</td>
                      <td><span class="badge">${esc(m.transaction_type)}</span></td>
                      <td>${esc(i?.name||'')}</td>
                      <td class="right ${Number(m.quantity)<0?'neg':'ok'}">${Number(m.quantity)>0?'+':''}${num(m.quantity)}</td>
                      <td>${esc(m.note||'')}</td>
                    </tr>`;
                  }).join('')}
                </table>
              </div>
            `:'<div class="empty">Chưa có biến động kho.</div>'}
          </div>
        </details>
      </div>
    `;
  }

  window.auditActionClass=auditActionClass;
  window.auditFilterRows=auditFilterRows;
  window.renderHistory=renderHistory;
  window.__lyActivityHistoryModule={version:VERSION,render:renderHistory};
})();
