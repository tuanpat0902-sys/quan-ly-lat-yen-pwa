/* Lát Yên — Activity History UI V1
   Extracted from Legacy index.html. Audit persistence remains in Legacy core. */
(()=>{
  'use strict';
  if(window.__lyActivityHistoryUIV1)return;
  window.__lyActivityHistoryUIV1=true;
  const VERSION='2026.08.31.1';
  const cloudState={orgId:'',rows:[],loading:false,loaded:false,hasMore:true,error:''};
  const PAGE_SIZE=250;let page=0;

  function cloudClient(){
    try{if(typeof sb!=='undefined'&&sb?.from)return sb;}catch(e){}
    return window.sb?.from?window.sb:null;
  }

  function activityModule(table){
    return ({
      ly_warehouses:'Kho/Chi nhánh',ly_suppliers:'Nhà cung cấp',
      ly_ingredients:'Nguyên liệu/ Dụng cụ',ly_prepared_items:'Pha chế',
      ly_products:'Thực đơn',ly_recipe_items:'Công thức',
      ly_import_receipts:'Nhập kho',ly_export_receipts:'Xuất kho',
      ly_stocktake_receipts:'Kiểm kê',ly_sales:'Bán hàng',
      ly_cashflow_entries:'Thu/Chi'
    })[String(table||'')]||'Hệ thống';
  }

  function cloudActivityRow(row){
    const event=String(row?.event_type||'').toLowerCase();
    const action=event==='insert'?'Tạo mới':event==='update'?'Cập nhật':event==='delete'?'Xóa':'Thay đổi';
    const amount=Number(row?.amount||0);
    return {
      id:`cloud_${row?.id||''}`,
      warehouse_id:'',
      module:activityModule(row?.entity_table),
      action,
      summary:String(row?.entity_name||row?.entity_id||'Dữ liệu Cloud'),
      details:amount>0?`Giá trị ${money(amount)}`:'Đồng bộ từ Cloud',
      created_at:row?.created_at||new Date().toISOString(),
      _cloud:true
    };
  }

  function activityRows(){
    const local=loadAuditLog();
    const seen=new Set();
    return [...cloudState.rows,...local]
      .filter(row=>{
        const key=String(row?.id||'');
        if(key&&seen.has(key))return false;
        if(key)seen.add(key);
        return true;
      })
      .sort((a,b)=>new Date(b?.created_at||0)-new Date(a?.created_at||0));
  }

  async function refreshCloudHistory(force=false,older=false){
    const orgId=String(window.__lyFreshOrgId||'');
    const client=cloudClient();
    if(!orgId||!client||cloudState.loading)return false;
    const orgChanged=cloudState.orgId!==orgId;
    if(!force&&cloudState.loaded&&!orgChanged&&!older)return true;
    cloudState.loading=true;cloudState.orgId=orgId;cloudState.error='';
    try{
      if(force||orgChanged){cloudState.rows=[];cloudState.hasMore=true;page=0;}
      if(older&&!cloudState.hasMore)return true;
      const from=cloudState.rows.length;
      const {data,error}=await client.from('ly_activity_events')
        .select('id,org_id,entity_table,entity_id,event_type,entity_name,amount,created_at')
        .eq('org_id',orgId).order('id',{ascending:false}).range(from,from+PAGE_SIZE-1);
      if(error)throw error;
      cloudState.rows=cloudState.rows.concat((data||[]).map(cloudActivityRow));
      cloudState.hasMore=(data||[]).length===PAGE_SIZE;
      cloudState.loaded=true;
      return true;
    }catch(error){
      cloudState.error=String(error?.message||error||'Không tải được lịch sử Cloud');
      return false;
    }finally{
      cloudState.loading=false;
      try{if(typeof activePanelId!=='undefined'&&activePanelId==='history')setTimeout(renderHistory,0);}catch(e){}
    }
  }

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
  
    return activityRows().filter(x=>{
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

  function pageCountForHistory(){return Math.max(1,Math.ceil(auditFilterRows().length/PAGE_SIZE));}

  function renderHistory(){
    if(!E.history)return;
    refreshCloudHistory(false);
  
    const allAuditRows=auditFilterRows();
    const pageCount=Math.max(1,Math.ceil(allAuditRows.length/PAGE_SIZE));
    page=Math.min(Math.max(0,page),pageCount-1);
    const pageStart=page*PAGE_SIZE;
    const auditRows=allAuditRows.slice(pageStart,pageStart+PAGE_SIZE);
    const modules=[...new Set(activityRows()
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
          ${allAuditRows.length>PAGE_SIZE||cloudState.hasMore?`<div class="history-limit-note">Đang hiển thị ${num(pageStart+1)}–${num(pageStart+auditRows.length)} trong dữ liệu đã tải.</div><div class="toolbar section-gap"><button type="button" class="secondary sm" onclick="changeActivityHistoryPage(-1)" ${page===0?'disabled':''}>← Mới hơn</button><span>Trang ${num(page+1)}${cloudState.hasMore?' / …':` / ${num(pageCount)}`}</span><button type="button" class="secondary sm" onclick="changeActivityHistoryPage(1)" ${page>=pageCount-1&&!cloudState.hasMore?'disabled':''}>Cũ hơn →</button></div>`:''}
          <div class="scroll">
            <table class="audit-table" data-ly-table-view="activity">
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
        `:`<div class="empty">${cloudState.loading?'Đang tải lịch sử hoạt động từ Cloud…':cloudState.error?'Không tải được lịch sử Cloud: '+esc(cloudState.error):'Chưa có hoạt động được ghi nhận.'}</div>`}
      </div>
  
      <div class="card section-gap">
        <details>
          <summary><b>Biến động kho trước đây</b> <span class="muted">(${num(legacyMovements.length)} dòng)</span></summary>
          <div class="section-gap">
            ${legacyMovements.length?`
              <div class="scroll">
                <table class="legacy-movement-table" data-ly-table-view="legacyMovements">
                  <tr><th>Thời gian</th><th>Loại</th><th>Nguyên liệu/ Dụng cụ</th><th class="right">SL</th><th>Ghi chú</th></tr>
                  ${legacyMovements.map(m=>{
                    const i=db.ingredients.find(x=>x.id===m.ingredient_id);
                    return `<tr>
                      <td>${dt(m.created_at)}</td>
                      <td><span class="badge">${esc(m.transaction_type)}</span></td>
                      <td>${esc(i?.name||'')}</td>
                      <td class="right ${Number(m.quantity)<0?'neg':'ok'}">${Number(m.quantity)>0?'+':''}${num(m.quantity)}</td>
                      <td><span class="ly-note-compact" title="${esc(m.note||'')}">${esc(m.note||'')}</span></td>
                    </tr>`;
                  }).join('')}
                </table>
              </div>
            `:'<div class="empty">Chưa có biến động kho.</div>'}
          </div>
        </details>
      </div>
    `;
    (window.queueMicrotask||window.setTimeout)?.(()=>window.__lyTableViewV2?.apply?.(E.history),0);
  }

  window.auditActionClass=auditActionClass;
  window.auditFilterRows=auditFilterRows;
  window.changeActivityHistoryPage=delta=>{const next=Number(delta)||0;if(next>0&&page>=pageCountForHistory()){refreshCloudHistory(false,true).then(()=>{page++;renderHistory();});return;}page=Math.max(0,page+next);renderHistory();E.history?.scrollIntoView?.({block:'start'});};
  window.renderHistory=renderHistory;
  window.__lyActivityHistoryModule={version:VERSION,render:renderHistory,refresh:()=>refreshCloudHistory(true),status:()=>({...cloudState,count:activityRows().length})};
})();
