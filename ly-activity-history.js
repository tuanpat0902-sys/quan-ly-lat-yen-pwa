/* Lát Yên — Activity History UI V1
   Extracted from Legacy index.html. Audit persistence remains in Legacy core. */
(()=>{
  'use strict';
  if(window.__lyActivityHistoryUIV1)return;
  window.__lyActivityHistoryUIV1=true;
  const VERSION='2026.09.21.4';
  const cloudState={orgId:'',rows:[],loading:false,loaded:false,hasMore:true,error:''};
  const movementState={warehouseId:'',rows:[],next:null,loading:false,loaded:false,hasMore:true,error:''};
  const PAGE_SIZE=50;let page=0,movementPage=0;

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
    if(cloudState.loading)return false;
    let orgId=String(window.__lyFreshOrgId||'');
    if(!orgId&&typeof window.v260EnsureAuth==='function'){
      try{await window.v260EnsureAuth();orgId=String(window.__lyFreshOrgId||'');}catch(e){}
    }
    if(!orgId){
      cloudState.loaded=true;
      cloudState.error='Chưa xác định được phiên làm việc. Vui lòng đăng nhập lại.';
      return false;
    }
    const orgChanged=cloudState.orgId!==orgId;
    if(!force&&cloudState.loaded&&!orgChanged&&!older)return true;
    cloudState.loading=true;cloudState.orgId=orgId;cloudState.error='';
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{
      if(force||orgChanged){cloudState.rows=[];cloudState.hasMore=true;page=0;}
      if(older&&!cloudState.hasMore)return true;
      const oldestId=older?cloudState.rows.reduce((min,row)=>{
        const id=Number(String(row?.id||'').replace(/^cloud_/,''))||0;
        return id&&(!min||id<min)?id:min;
      },0):0;
      const url=`/api/v1/activity-events?org_id=${encodeURIComponent(orgId)}&limit=${PAGE_SIZE}${oldestId?`&before=${oldestId}`:''}`;
      const response=await fetch(url,{cache:'no-store',credentials:'same-origin',signal:controller.signal});
      if(!response.ok)throw new Error(`Máy chủ trả về mã ${response.status}`);
      const data=(await response.json())?.rows||[];
      const known=new Set(cloudState.rows.map(row=>String(row.id||'')));
      cloudState.rows=cloudState.rows.concat(data.map(cloudActivityRow).filter(row=>!known.has(String(row.id||''))));
      cloudState.hasMore=data.length===PAGE_SIZE;
      cloudState.loaded=true;
      return true;
    }catch(error){
      cloudState.loaded=true;
      cloudState.error=error?.name==='AbortError'
        ?'Máy chủ phản hồi quá lâu. Hãy bấm Tải lại.'
        :String(error?.message||error||'Không tải được lịch sử Cloud');
      return false;
    }finally{
      clearTimeout(timeout);
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

  async function refreshMovementHistory(force=false,older=false){
    const orgId=String(window.__lyFreshOrgId||''),warehouseId=String(typeof currentWarehouseId==='undefined'?'':currentWarehouseId||'');
    if(!orgId||!warehouseId||movementState.loading)return false;
    const changed=movementState.warehouseId!==warehouseId;
    if(!force&&!changed&&movementState.loaded&&!older)return true;
    if((force||changed)){movementState.warehouseId=warehouseId;movementState.rows=[];movementState.next=null;movementState.hasMore=true;movementPage=0;}
    if(older&&!movementState.hasMore)return true;
    movementState.loading=true;movementState.error='';const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try{const before=older&&movementState.next?`&before=${encodeURIComponent(movementState.next)}`:'',response=await fetch(`/api/v1/history/stock?org_id=${encodeURIComponent(orgId)}&warehouse_id=${encodeURIComponent(warehouseId)}&limit=${PAGE_SIZE}${before}`,{cache:'no-store',credentials:'same-origin',signal:controller.signal});if(!response.ok)throw new Error(`Máy chủ trả về mã ${response.status}`);const payload=await response.json(),known=new Set(movementState.rows.map(row=>String(row.id)));movementState.rows.push(...(payload.rows||[]).filter(row=>!known.has(String(row.id))));movementState.next=payload.next||null;movementState.hasMore=Boolean(payload.next);movementState.loaded=true;return true;}
    catch(error){movementState.loaded=true;movementState.error=error?.name==='AbortError'?'Máy chủ phản hồi quá lâu.':String(error?.message||error);return false;}
    finally{clearTimeout(timeout);movementState.loading=false;setTimeout(()=>{try{if(activePanelId==='history')renderHistory()}catch(e){}},0);}
  }

  function pageCountForHistory(){return Math.max(1,Math.ceil(auditFilterRows().length/PAGE_SIZE));}

  function renderHistory(){
    if(!E.history)return;
    refreshCloudHistory(false);
    refreshMovementHistory(false);
  
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
  
    const fallbackMovements=(db.movements||[]).filter(m=>m.warehouse_id===currentWarehouseId).slice().sort((a,b)=>new Date(b?.created_at||0)-new Date(a?.created_at||0));
    const allLegacyMovements=movementState.loaded&&movementState.warehouseId===String(currentWarehouseId)?movementState.rows:fallbackMovements;
    const movementPageCount=Math.max(1,Math.ceil(allLegacyMovements.length/PAGE_SIZE));
    movementPage=Math.min(Math.max(0,movementPage),movementPageCount-1);
    const movementStart=movementPage*PAGE_SIZE;
    const legacyMovements=allLegacyMovements.slice(movementStart,movementStart+PAGE_SIZE);
  
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
        `:`<div class="empty">${cloudState.loading?'Đang tải lịch sử hoạt động…':cloudState.error?`${esc(cloudState.error)}<div class="section-gap"><button type="button" class="secondary sm" onclick="window.__lyActivityHistoryModule.refresh()">Tải lại</button></div>`:'Chưa có hoạt động được ghi nhận.'}</div>`}
      </div>
  
      <div class="card section-gap">
        <div class="history-head">
          <h3>Toàn bộ biến động kho</h3>
          <div class="history-count">${num(allLegacyMovements.length)} dòng đã tải</div>
        </div>
        <div class="section-gap">
            ${legacyMovements.length?`
              ${allLegacyMovements.length>PAGE_SIZE?`<div class="history-limit-note">Đang hiển thị ${num(movementStart+1)}–${num(movementStart+legacyMovements.length)} trong ${num(allLegacyMovements.length)} biến động.</div>`:''}
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
              ${allLegacyMovements.length>PAGE_SIZE||movementState.hasMore?`<div class="toolbar section-gap"><button type="button" class="secondary sm" onclick="changeInventoryMovementPage(-1)" ${movementPage===0?'disabled':''}>← Mới hơn</button><span>Trang ${num(movementPage+1)}${movementState.hasMore?' / …':` / ${num(movementPageCount)}`}</span><button type="button" class="secondary sm" onclick="changeInventoryMovementPage(1)" ${movementPage>=movementPageCount-1&&!movementState.hasMore?'disabled':''}>Cũ hơn →</button></div>`:''}
            `:`<div class="empty">${movementState.loading?'Đang tải biến động kho…':movementState.error?esc(movementState.error):'Chưa có biến động kho.'}</div>`}
        </div>
      </div>
    `;
    (window.queueMicrotask||window.setTimeout)?.(()=>window.__lyTableViewV2?.apply?.(E.history),0);
  }

  window.auditActionClass=auditActionClass;
  window.auditFilterRows=auditFilterRows;
  window.changeActivityHistoryPage=delta=>{const next=Number(delta)||0;if(next>0&&page>=pageCountForHistory()-1&&cloudState.hasMore){refreshCloudHistory(false,true).then(ok=>{if(ok)page=Math.min(page+1,pageCountForHistory()-1);renderHistory();E.history?.scrollIntoView?.({block:'start'});});return;}page=Math.max(0,page+next);renderHistory();E.history?.scrollIntoView?.({block:'start'});};
  window.changeInventoryMovementPage=delta=>{const next=Number(delta)||0,pageCount=Math.max(1,Math.ceil(movementState.rows.length/PAGE_SIZE));if(next>0&&movementPage>=pageCount-1&&movementState.hasMore){refreshMovementHistory(false,true).then(ok=>{if(ok)movementPage+=1;renderHistory();});return;}movementPage=Math.max(0,movementPage+next);renderHistory();E.history?.querySelector?.('.legacy-movement-table')?.scrollIntoView?.({block:'start'});};
  window.renderHistory=renderHistory;
  window.__lyActivityHistoryModule={version:VERSION,render:renderHistory,refresh:()=>Promise.all([refreshCloudHistory(true),refreshMovementHistory(true)]),status:()=>({...cloudState,count:activityRows().length,movements:{...movementState}})};
})();
