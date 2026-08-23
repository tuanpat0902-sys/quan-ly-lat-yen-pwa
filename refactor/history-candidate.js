/* AUTO-GENERATED ANALYSIS CANDIDATE — NOT LOADED BY PRODUCTION */
(()=>{
'use strict';

// v254NewWarehouseAudit: index.html lines 17686-17719
function v254NewWarehouseAudit(warehouseId){
  const products=warehouseProducts(warehouseId);
  const ingredients=warehouseIngredients(warehouseId);

  const inventory=(db.inventory||[])
    .filter(x=>
      String(x.warehouse_id||'')===String(warehouseId)
    );

  const movements=(db.movements||[])
    .filter(x=>
      x?._stocktake_audit_only!==true &&
      String(x.warehouse_id||'')===String(warehouseId)
    );

  const sales=(db.sales||[])
    .filter(x=>
      String(x.warehouse_id||'')===String(warehouseId)
    );

  return {
    products:products.length,
    ingredients:ingredients.length,
    inventory:inventory.length,
    movements:movements.length,
    sales:sales.length,
    clean:
      products.length===0 &&
      ingredients.length===0 &&
      inventory.length===0 &&
      movements.length===0 &&
      sales.length===0
  };
}

// v229RepairMissingHistory: index.html lines 24002-24212
async function v229RepairMissingHistory(){
  if(!navigator.onLine){
    throw new Error(
      'Thiết bị đang offline.'
    );
  }

  if(!v228CloudProof?.at){
    await loadCloudFastV202(
      true
    );
  }

  let missing=
    v229MissingRows();

  const activeMissing=
    Object.entries(missing)
      .filter(([,rows])=>
        Array.isArray(rows)&&
        rows.length
      );

  if(!activeMissing.length){
    return {
      repaired:0,
      before:0,
      after:0,
      skipped:true,
      reason:'already_clean'
    };
  }

  const unsafeTables=
    activeMissing
      .map(([table])=>table)
      .filter(table=>
        !V229_HISTORY_TABLES.has(
          table
        )
      );

  if(unsafeTables.length){
    return {
      repaired:0,
      before:
        activeMissing.reduce(
          (sum,[,rows])=>
            sum+rows.length,
          0
        ),
      after:
        activeMissing.reduce(
          (sum,[,rows])=>
            sum+rows.length,
          0
        ),
      skipped:true,
      reason:
        'unsafe_missing_tables',
      unsafeTables
    };
  }

  /*
    Critical V229 safety rule:
    Do not replay business RPCs.
    Do not write inventory.
    These are history records only, because current inventory is already
    authoritative on Cloud.
  */
  const referenceMap={};

  const sales=
    missing.sales||[];

  const saleItems=
    missing.sale_items||[];

  const movements=
    missing.stock_transactions||[];

  const salePayload=[];

  for(const row of sales){
    salePayload.push(
      await v229SalePayload(
        row,
        referenceMap
      )
    );
  }

  const itemPayload=[];

  for(
    let i=0;
    i<saleItems.length;
    i++
  ){
    itemPayload.push(
      await v229SaleItemPayload(
        saleItems[i],
        i,
        referenceMap
      )
    );
  }

  const movementPayload=[];

  for(const row of movements){
    movementPayload.push(
      await v229MovementPayload(
        row,
        referenceMap
      )
    );
  }

  const before=
    sales.length+
    saleItems.length+
    movements.length;

  let repaired=0;

  // Respect FK order.
  if(salePayload.length){
    repaired+=
      await v229UpsertChunks(
        'sales',
        salePayload
      );
  }

  if(itemPayload.length){
    repaired+=
      await v229UpsertChunks(
        'sale_items',
        itemPayload
      );
  }

  if(movementPayload.length){
    repaired+=
      await v229UpsertChunks(
        'stock_transactions',
        movementPayload
      );
  }

  /*
    Save deterministic legacy reference mappings only AFTER all Cloud writes
    completed. No local row is deleted here.
  */
  if(
    Object.keys(
      referenceMap
    ).length
  ){
    saveLegacyCloudMapV205({
      references:
        referenceMap
    });
  }

  // Fresh authoritative verification.
  await loadCloudFastV202(
    true
  );

  missing=
    v229MissingRows();

  const after=
    Object.values(missing)
      .reduce(
        (sum,rows)=>
          sum+
          (
            Array.isArray(rows)
              ?rows.length
              :0
          ),
        0
      );

  if(after===0){
    v228ClearProvenStaleFlags();
    cacheSave();
    flushCacheSave();
  }

  return {
    repaired,
    before,
    after,
    skipped:false,
    sales:
      salePayload.length,
    sale_items:
      itemPayload.length,
    movements:
      movementPayload.length,
    remaining:
      v229MissingSummary(
        missing
      )
  };
}

// debouncedHistoryRender: index.html lines 26752-26755
function debouncedHistoryRender(){
  clearTimeout(historySearchTimer);
  historySearchTimer=setTimeout(()=>renderHistory(),180);
}

// ingredientUsageHistoryHtml: index.html lines 27601-27601
function ingredientUsageHistoryHtml(filters={}

// renderIngredientUsageHistory: index.html lines 27725-27750
function renderIngredientUsageHistory(){
  const area=$('ingredientUsageHistoryArea');
  if(!area)return;

  const ingredientId=$('ingredientUsageIngredient')?.value||'all';
  const source=$('ingredientUsageSource')?.value||'all';
  const from=$('ingredientUsageFrom')?.value||'';
  const to=$('ingredientUsageTo')?.value||'';

  if(from && to && from>to){
    area.innerHTML=
      '<div class="warnbox">Từ ngày không được lớn hơn đến ngày.</div>';
    return;
  }

  area.innerHTML=ingredientUsageHistoryHtml({
    ingredientId,
    source,
    from,
    to
  });

  requestAnimationFrame(()=>{
    refreshSerialNumbers?.(area);
  });
}

// importReceiptHistoryTable: index.html lines 28532-28659
function importReceiptHistoryTable(){
  const rows=(db.movements||[])
    .filter(m=>m.warehouse_id===currentWarehouseId&&m.transaction_type==='IMPORT')
    .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));

  if(!rows.length)return '<div class="empty">Chưa có phiếu nhập kho</div>';

  const days={};

  for(const m of rows){
    const d=new Date(m.created_at||0);
    const savedDate=receiptDateFromMovement(m);

    let dayKey=d.toLocaleDateString('vi-VN');
    let dayTimestamp=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();

    if(/^\d{4}-\d{2}-\d{2}$/.test(savedDate)){
      const parts=savedDate.split('-').map(Number);
      dayKey=`${String(parts[2]).padStart(2,'0')}/${String(parts[1]).padStart(2,'0')}/${parts[0]}`;
      dayTimestamp=new Date(parts[0],parts[1]-1,parts[2]).getTime();
    }

    const receipt=receiptNumberFromMovement(m);
    const groupKey=receiptGroupKeyForMovement(m);

    if(!days[dayKey]){
      days[dayKey]={
        date:dayKey,
        timestamp:dayTimestamp,
        receipts:{}
      };
    }

    if(!days[dayKey].receipts[groupKey]){
      days[dayKey].receipts[groupKey]={
        receipt,
        groupKey,
        timestamp:d.getTime(),
        rows:[],
        total:0
      };
    }

    const g=days[dayKey].receipts[groupKey];
    g.rows.push(m);
    g.timestamp=Math.max(g.timestamp,d.getTime());
    g.total+=importTotalFromMovement(m)||0;
  }

  const groupedDays=Object.values(days)
    .sort((a,b)=>b.timestamp-a.timestamp)
    .slice(0,30);

  return groupedDays.map((day,dayIndex)=>{
    const receipts=Object.values(day.receipts).sort((a,b)=>b.timestamp-a.timestamp);
    const dayTotal=receipts.reduce((sum,r)=>sum+r.total,0);
    const itemCount=receipts.reduce((sum,r)=>sum+r.rows.length,0);

    return `
      <div class="import-day-group collapsed">
        <div class="import-day-head clickable" onclick="toggleImportDay('importDay${dayIndex}',this)">
          <div>
            <b>Ngày ${esc(day.date)}</b>
            <div class="muted">${receipts.length} phiếu • ${itemCount} mặt hàng</div>
          </div>
          <div class="import-day-summary">
            <b>${money(dayTotal)}</b>
            <span class="import-day-chevron">▸</span>
          </div>
        </div>

        <div id="importDay${dayIndex}" class="import-day-body import-day-collapsible">
          ${receipts.map((g,receiptIndex)=>{
            const encoded=encodeURIComponent(g.groupKey);

            return `
              <div class="receipt-history-item">
                <div class="receipt-history-head">
                  <div class="receipt-click-area" onclick="toggleReceiptHistory('receiptHistory${dayIndex}_${receiptIndex}',this.parentElement)">
                    <b>${esc(g.receipt)}</b>
                    <div class="muted">
                      ${new Date(g.timestamp).toLocaleTimeString('vi-VN')} • ${g.rows.length} mặt hàng
                    </div>
                  </div>

                  <div class="receipt-head-actions">
                    <b>${money(g.total)}</b>
                    <button type="button" class="secondary sm" onclick="editImportReceipt('${encoded}')">Sửa</button>
                    <button type="button" class="danger sm" onclick="event.stopPropagation();deleteImportReceipt('${encoded}')">Xóa phiếu</button>
                    <button type="button" class="secondary sm receipt-expand-btn" onclick="toggleReceiptHistory('receiptHistory${dayIndex}_${receiptIndex}',this.parentElement.parentElement)">
                      <span class="receipt-chevron">▸</span>
                    </button>
                  </div>
                </div>

                <div id="receiptHistory${dayIndex}_${receiptIndex}" class="receipt-history-body">
                  <div class="scroll">
                    <table class="import-history-detail-table">
                      <tr>
                        <th class="import-col-stt">STT</th>
                        <th class="import-col-name">Nguyên liệu/ Dụng cụ</th>
                        <th class="import-col-unit">Đơn vị</th>
                        <th class="import-col-supplier">Nhà cung cấp</th>
                        <th class="right import-col-qty">Số lượng</th>
                        <th class="right import-col-price">Giá nhập/đv</th>
                        <th class="right import-col-total">Thành tiền</th>
                      </tr>
                      ${g.rows.map((m,rowIndex)=>{
                        const ing=db.ingredients.find(i=>i.id===m.ingredient_id);
                        const supplier=latestSupplierForMovement(m);
                        const unitCost=importCostFromMovement(m);
                        const total=importTotalFromMovement(m);

                        return `<tr>
                          <td class="import-stt-cell">${rowIndex+1}</td>
                          <td class="import-name-cell"><b>${esc(ing?.name||'')}</b></td>
                          <td class="import-unit-cell">${esc(ing?.unit||'—')}</td>
                          <td class="import-supplier-cell">${esc(supplier||'—')}</td>
                          <td class="right import-qty-cell">${num(m.quantity)}</td>
                          <td class="right import-price-cell">${unitCost!=null?money(unitCost):'—'}</td>
                          <td class="right import-total-cell"><b>${total!=null?money(total):'—'}</b></td>
                        </tr>`;
                      }).join('')}
                    </table>
                  </div>
                </div>
              </div>`;
          }).join('')}

// toggleReceiptHistory: index.html lines 28673-28679
function toggleReceiptHistory(id,head){
  const body=$(id);
  if(!body)return;
  const open=body.classList.toggle('open');
  const chev=head?.querySelector('.receipt-chevron');
  if(chev)chev.textContent=open?'▾':'▸';
}

// exportReceiptHistoryTable: index.html lines 30407-30620
function exportReceiptHistoryTable(){
  const rows=(db.movements||[])
    .filter(m=>
      m.warehouse_id===currentWarehouseId &&
      String(m.transaction_type||'').toUpperCase()==='EXPORT' &&
      !isExportReceiptDeleted(m.reference_id)
    )
    .sort((a,b)=>
      new Date(b.created_at||0)-new Date(a.created_at||0)
    );

  if(!rows.length){
    return '<div class="empty">Chưa có phiếu xuất kho</div>';
  }

  const days={};

  for(const m of rows){
    const ref=String(
      m.reference_id||`legacy:${m.id}`
    );

    const savedDate=exportReceiptDateFromMovement(m);

    const dateIso=
      /^\d{4}-\d{2}-\d{2}$/.test(savedDate)
        ?savedDate
        :movementExportDateISO(m);

    const parts=dateIso.split('-').map(Number);
    const dayKey=
      parts.length===3
        ?`${String(parts[2]).padStart(2,'0')}/${String(parts[1]).padStart(2,'0')}/${parts[0]}`
        :dateIso;

    const dayTimestamp=
      parts.length===3
        ?new Date(parts[0],parts[1]-1,parts[2]).getTime()
        :new Date(m.created_at||0).getTime();

    if(!days[dayKey]){
      days[dayKey]={
        date:dayKey,
        dateIso,
        timestamp:dayTimestamp,
        receipts:{}
      };
    }

    if(!days[dayKey].receipts[ref]){
      days[dayKey].receipts[ref]={
        referenceId:ref,
        receipt:exportReceiptNumberFromMovement(m),
        timestamp:new Date(m.created_at||0).getTime(),
        rows:[],
        total:0
      };
    }

    const group=days[dayKey].receipts[ref];

    group.rows.push(m);

    group.timestamp=Math.max(
      group.timestamp,
      new Date(m.created_at||0).getTime()
    );

    group.total+=
      Number(exportTotalFromMovement(m)||0);
  }

  const groupedDays=Object.values(days)
    .sort((a,b)=>b.timestamp-a.timestamp)
    .slice(0,30);

  return groupedDays.map((day,dayIndex)=>{
    const receipts=Object.values(day.receipts)
      .sort((a,b)=>b.timestamp-a.timestamp);

    const dayTotal=receipts.reduce(
      (sum,r)=>sum+Number(r.total||0),
      0
    );

    const itemCount=receipts.reduce(
      (sum,r)=>sum+r.rows.length,
      0
    );

    return `
      <div class="import-day-group export-day-group collapsed">
        <div
          class="import-day-head clickable export-day-head"
          onclick="toggleImportDay('exportDay${dayIndex}',this)"
        >
          <div>
            <b>Ngày ${esc(day.date)}</b>

            <div class="muted">
              ${receipts.length} phiếu • ${itemCount} mặt hàng
            </div>
          </div>

          <div class="import-day-summary">
            <b>${money(dayTotal)}</b>
            <span class="import-day-chevron">▸</span>
          </div>
        </div>

        <div
          id="exportDay${dayIndex}"
          class="import-day-body import-day-collapsible"
        >
          ${receipts.map((g,receiptIndex)=>{
            const bodyId=
              `exportHistoryBody${dayIndex}_${receiptIndex}`;

            const encoded=
              encodeURIComponent(g.referenceId);

            return `
              <div class="receipt-history-item export-history-item">
                <div class="receipt-history-head">
                  <div
                    class="receipt-click-area"
                    onclick="toggleReceiptHistory('${bodyId}',this.parentElement)"
                  >
                    <b>${esc(g.receipt)}</b>

                    <div class="muted">
                      ${new Date(g.timestamp).toLocaleTimeString('vi-VN')}
                      • ${g.rows.length} mặt hàng
                    </div>
                  </div>

                  <div class="receipt-head-actions">
                    <b>${money(g.total)}</b>

                    <button
                      type="button"
                      class="secondary sm"
                      onclick="event.stopPropagation();editExportReceipt('${encoded}')"
                    >Sửa</button>

                    <button
                      type="button"
                      class="danger sm"
                      onclick="event.stopPropagation();deleteExportReceipt('${encoded}')"
                    >Xóa phiếu</button>

                    <button
                      type="button"
                      class="secondary sm receipt-expand-btn"
                      onclick="toggleReceiptHistory('${bodyId}',this.parentElement.parentElement)"
                    >
                      <span class="receipt-chevron">▸</span>
                    </button>
                  </div>
                </div>

                <div id="${bodyId}" class="receipt-history-body">
                  <div class="scroll">
                    <table class="export-history-detail-table">
                      <tr>
                        <th>STT</th>
                        <th>Nguyên liệu/Dụng cụ</th>
                        <th>Đơn vị</th>
                        <th class="right">Số lượng xuất</th>
                        <th class="right">Đơn giá</th>
                        <th class="right">Thành tiền</th>
                        <th class="right">Tồn sau xuất</th>
                        <th>Lý do/Ghi chú</th>
                      </tr>

                      ${g.rows.map((m,rowIndex)=>{
                        const ing=(db.ingredients||[]).find(
                          i=>i.id===m.ingredient_id
                        );

                        const note=String(m.note||'');

                        const after=Number(
                          note.match(/Sau:([^|]+)/i)?.[1]||0
                        );

                        const reason=
                          note.match(/Lý do:([^|]*)/i)?.[1]?.trim()||'';

                        const unitCost=
                          exportCostFromMovement(m)||0;

                        const total=
                          exportTotalFromMovement(m)||0;

                        return `
                          <tr>
                            <td>${rowIndex+1}</td>
                            <td><b>${esc(ing?.name||'Mặt hàng đã xóa')}</b></td>
                            <td>${esc(ing?.unit||'')}</td>
                            <td class="right"><b>${num(Math.abs(Number(m.quantity||0)))}</b></td>
                            <td class="right">${money(unitCost)}</td>
                            <td class="right"><b>${money(total)}</b></td>
                            <td class="right ${after<0?'neg':''}">${num(after)}</td>
                            <td>${esc(reason||'—')}</td>
                          </tr>
                        `;
                      }).join('')}
                    </table>
                  </div>
                </div>
              </div>
            `;
          }).join('')}

// warehouseReceiptHistoryTable: index.html lines 31097-31417
function warehouseReceiptHistoryTable(){
  const indexes=getDataIndexes();

  const importRows=
    indexes.movementsByWarehouseType.get(
      `${currentWarehouseId}|IMPORT`
    )||[];

  const exportRows=
    indexes.movementsByWarehouseType.get(
      `${currentWarehouseId}|EXPORT`
    )||[];

  const movements=[
    ...importRows,
    ...exportRows.filter(m=>
      !isExportReceiptDeleted(m.reference_id)
    )
  ];

  if(!movements.length){
    return '<div class="empty">Chưa có phiếu nhập/xuất kho</div>';
  }

  const days={};

  function ensureDay(dateIso,timestamp){
    const parts=String(dateIso||'').split('-').map(Number);

    const dayKey=
      parts.length===3
        ?`${String(parts[2]).padStart(2,'0')}/${String(parts[1]).padStart(2,'0')}/${parts[0]}`
        :String(dateIso||'');

    if(!days[dayKey]){
      days[dayKey]={
        date:dayKey,
        dateIso,
        timestamp,
        receipts:{}
      };
    }

    days[dayKey].timestamp=Math.max(
      Number(days[dayKey].timestamp||0),
      Number(timestamp||0)
    );

    return days[dayKey];
  }

  for(const m of movements){
    const isImport=m.transaction_type==='IMPORT';

    const dateIso=isImport
      ?movementImportDateISO(m)
      :movementExportDateISO(m);

    const timestamp=
      new Date(m.created_at||0).getTime();

    const day=ensureDay(dateIso,timestamp);

    const key=isImport
      ?`IMPORT:${receiptGroupKeyForMovement(m)}`
      :`EXPORT:${String(m.reference_id||m.id||'')}`;

    if(!day.receipts[key]){
      day.receipts[key]={
        type:isImport?'IMPORT':'EXPORT',
        key:isImport
          ?receiptGroupKeyForMovement(m)
          :String(m.reference_id||m.id||''),
        receipt:isImport
          ?receiptNumberFromMovement(m)
          :exportReceiptNumberFromMovement(m),
        timestamp,
        rows:[],
        total:0
      };
    }

    const group=day.receipts[key];

    group.rows.push(m);

    group.timestamp=Math.max(
      group.timestamp,
      timestamp
    );

    group.total+=isImport
      ?Number(importTotalFromMovement(m)||0)
      :Number(exportTotalFromMovement(m)||0);
  }

  const groupedDays=Object.values(days)
    .sort((a,b)=>b.timestamp-a.timestamp)
    .slice(0,30);

  return groupedDays.map((day,dayIndex)=>{
    const receipts=Object.values(day.receipts)
      .sort((a,b)=>b.timestamp-a.timestamp);

    const imports=receipts.filter(
      r=>r.type==='IMPORT'
    );

    const exports=receipts.filter(
      r=>r.type==='EXPORT'
    );

    const importTotal=imports.reduce(
      (sum,r)=>sum+Number(r.total||0),
      0
    );

    const exportTotal=exports.reduce(
      (sum,r)=>sum+Number(r.total||0),
      0
    );

    const itemCount=receipts.reduce(
      (sum,r)=>sum+r.rows.length,
      0
    );

    return `
      <div class="import-day-group warehouse-history-day collapsed">
        <div
          class="import-day-head clickable warehouse-history-day-head"
          onclick="toggleImportDay('warehouseHistoryDay${dayIndex}',this)"
        >
          <div>
            <b>Ngày ${esc(day.date)}</b>

            <div class="muted">
              ${imports.length} phiếu nhập
              • ${exports.length} phiếu xuất
              • ${itemCount} mặt hàng
            </div>
          </div>

          <div class="warehouse-history-day-summary">
            <span class="warehouse-day-import">Nhập ${money(importTotal)}</span>
            <span class="warehouse-day-export">Xuất ${money(exportTotal)}</span>
            <span class="import-day-chevron">▸</span>
          </div>
        </div>

        <div
          id="warehouseHistoryDay${dayIndex}"
          class="import-day-body import-day-collapsible"
        >
          ${receipts.map((g,receiptIndex)=>{
            const bodyId=
              `warehouseReceiptBody${dayIndex}_${receiptIndex}`;

            const encoded=
              encodeURIComponent(g.key);

            const isImport=
              g.type==='IMPORT';

            return `
              <div class="receipt-history-item warehouse-history-receipt ${
                isImport
                  ?'warehouse-history-import'
                  :'warehouse-history-export'
              }">
                <div class="receipt-history-head">
                  <div
                    class="receipt-click-area"
                    onclick="toggleReceiptHistory('${bodyId}',this.parentElement)"
                  >
                    <div class="warehouse-receipt-title">
                      <span class="warehouse-movement-badge ${
                        isImport
                          ?'warehouse-movement-import'
                          :'warehouse-movement-export'
                      }">
                        ${isImport?'Nhập kho':'Xuất kho'}
                      </span>

                      <b>${esc(g.receipt)}</b>
                    </div>

                    <div class="muted">
                      ${new Date(g.timestamp).toLocaleTimeString('vi-VN')}
                      • ${g.rows.length} mặt hàng
                    </div>
                  </div>

                  <div class="receipt-head-actions">
                    <b>${money(g.total)}</b>

                    <button
                      type="button"
                      class="secondary sm"
                      onclick="event.stopPropagation();${
                        isImport
                          ?`editImportReceipt('${encoded}')`
                          :`editExportReceipt('${encoded}')`
                      }"
                    >Sửa</button>

                    <button
                      type="button"
                      class="danger sm"
                      onclick="event.stopPropagation();${
                        isImport
                          ?`deleteImportReceipt('${encoded}')`
                          :`deleteExportReceipt('${encoded}')`
                      }"
                    >Xóa phiếu</button>

                    <button
                      type="button"
                      class="secondary sm receipt-expand-btn"
                      onclick="toggleReceiptHistory('${bodyId}',this.parentElement.parentElement)"
                    >
                      <span class="receipt-chevron">▸</span>
                    </button>
                  </div>
                </div>

                <div
                  id="${bodyId}"
                  class="receipt-history-body"
                >
                  <div class="scroll">
                    ${isImport?`
                      <table class="import-history-detail-table">
                        <tr>
                          <th>STT</th>
                          <th>Nguyên liệu/Dụng cụ</th>
                          <th>Đơn vị</th>
                          <th>Nhà cung cấp</th>
                          <th class="right">Số lượng</th>
                          <th class="right">Đơn giá</th>
                          <th class="right">Thành tiền</th>
                        </tr>

                        ${g.rows.map((m,rowIndex)=>{
                          const ing=indexes.ingredientById.get(
                            m.ingredient_id
                          );

                          const supplier=
                            latestSupplierForMovement(m);

                          const unitCost=
                            importCostFromMovement(m);

                          const total=
                            importTotalFromMovement(m);

                          return `
                            <tr>
                              <td>${rowIndex+1}</td>
                              <td><b>${esc(ing?.name||'Mặt hàng đã xóa')}</b></td>
                              <td>${esc(ing?.unit||'')}</td>
                              <td>${esc(supplier||'—')}</td>
                              <td class="right">${num(Number(m.quantity||0))}</td>
                              <td class="right">${unitCost!=null?money(unitCost):'—'}</td>
                              <td class="right"><b>${total!=null?money(total):'—'}</b></td>
                            </tr>
                          `;
                        }).join('')}
                      </table>
                    `:`
                      <table class="export-history-detail-table">
                        <tr>
                          <th>STT</th>
                          <th>Nguyên liệu/Dụng cụ</th>
                          <th>Đơn vị</th>
                          <th class="right">Số lượng xuất</th>
                          <th class="right">Đơn giá</th>
                          <th class="right">Thành tiền</th>
                          <th class="right">Tồn sau xuất</th>
                          <th>Lý do/Ghi chú</th>
                        </tr>

                        ${g.rows.map((m,rowIndex)=>{
                          const ing=indexes.ingredientById.get(
                            m.ingredient_id
                          );

                          const note=String(m.note||'');

                          const after=Number(
                            note.match(/Sau:([^|]+)/i)?.[1]||0
                          );

                          const reason=
                            note.match(/Lý do:([^|]*)/i)?.[1]?.trim()||'';

                          return `
                            <tr>
                              <td>${rowIndex+1}</td>
                              <td><b>${esc(ing?.name||'Mặt hàng đã xóa')}</b></td>
                              <td>${esc(ing?.unit||'')}</td>
                              <td class="right">${num(Math.abs(Number(m.quantity||0)))}</td>
                              <td class="right">${money(exportCostFromMovement(m)||0)}</td>
                              <td class="right"><b>${money(exportTotalFromMovement(m)||0)}</b></td>
                              <td class="right ${after<0?'neg':''}">${num(after)}</td>
                              <td>${esc(reason||'—')}</td>
                            </tr>
                          `;
                        }).join('')}
                      </table>
                    `}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

// saleReceiptHistoryTable: index.html lines 34369-34503
function saleReceiptHistoryTable(){
  const indexes=getDataIndexes();

  const sales=[
    ...(indexes.salesByWarehouse
      .get(currentWarehouseId)||
      [])
  ]
    .sort((a,b)=>
      new Date(
        b.sold_at||b.created_at
      )-
      new Date(
        a.sold_at||a.created_at
      )
    )
    .slice(0,30);

  if(!sales.length){
    return '<div class="empty">Chưa có phiếu bán hàng</div>';
  }

  return `
    <div class="scroll">
      <table>
        <tr>
          <th>Ngày/giờ</th>
          <th>Số phiếu</th>
          <th>Nguồn</th>
          <th class="right">Số món</th>
          <th class="right">Tạm tính</th>
          <th class="right">Giảm giá</th>
          <th class="right">Thanh toán</th>
          <th></th>
        </tr>

        ${sales.map(s=>{
          const items=
            indexes.saleItemsBySale.get(s.id)||
            [];

          const qty=
            items.reduce(
              (n,x)=>
                n+Number(x.quantity||0),
              0
            );

          const saleNote=
            String(s.note||'');

          const receipt=
            saleReceiptNumber(s);

          const subtotalRaw=
            Number(
              saleNote.match(
                /Tạm tính:([^|]+)/i
              )?.[1]||
              s.total_amount||
              0
            );

          const receiptDiscountRaw=
            Number(
              saleNote.match(
                /Giảm:[^:|]+:[^:|]+:([^|]+)/i
              )?.[1]||
              0
            );

          const itemDiscountRaw=
            Number(
              saleNote.match(
                /Giảm món:([^|]+)/i
              )?.[1]||
              0
            );

          const discountRaw=
            receiptDiscountRaw+
            itemDiscountRaw;

          return `
            <tr>
              <td>${dt(s.sold_at||s.created_at)}</td>

              <td>${esc(receipt)}</td>

              <td>
                <span class="badge">
                  ${esc(s.source||'manual')}
                </span>
              </td>

              <td class="right">
                ${num(qty)}
              </td>

              <td class="right">
                ${money(subtotalRaw)}
              </td>

              <td class="right">
                ${discountRaw>0
                  ?'− '+money(discountRaw)
                  :money(0)}
              </td>

              <td class="right">
                <b>${money(s.total_amount||0)}</b>
              </td>

              <td class="right">
                <div class="sale-history-actions">
                  <button
                    type="button"
                    class="secondary sm"
                    onclick="editSaleReceipt('${s.id}')"
                  >Sửa</button>

                  <button
                    type="button"
                    class="danger sm"
                    onclick="deleteSaleReceipt('${s.id}')"
                  >Xóa</button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </table>
    </div>
  `;
}

// recentStocktakeHistory: index.html lines 37212-37315
function recentStocktakeHistory(){
  const indexes=getDataIndexes();

  const rows=(
    indexes.movementsByWarehouseType.get(
      `${currentWarehouseId}|ADJUSTMENT`
    )||[]
  )
    .filter(m=>
      String(m.note||'').toLowerCase().includes('kiểm kê')
    )
    .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));

  if(!rows.length)return '<div class="empty">Chưa có lịch sử kiểm kê</div>';

  const days={};

  for(const m of rows){
    const d=new Date(m.created_at||0);
    const dayKey=d.toLocaleDateString('vi-VN');
    if(!days[dayKey]){
      days[dayKey]={date:dayKey,timestamp:new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime(),sessions:{}};
    }

    const sk=stocktakeSessionKey(m);
    if(!days[dayKey].sessions[sk]){
      days[dayKey].sessions[sk]={
        id:sk,
        timestamp:d.getTime(),
        rows:[],
        positive:0,
        negative:0
      };
    }

    const s=days[dayKey].sessions[sk];
    s.rows.push(m);
    s.timestamp=Math.max(s.timestamp,d.getTime());

    const q=Number(m.quantity||0);
    if(q>0)s.positive+=q;
    if(q<0)s.negative+=Math.abs(q);
  }

  const groupedDays=Object.values(days)
    .sort((a,b)=>b.timestamp-a.timestamp)
    .slice(0,30);

  return groupedDays.map((day,dayIndex)=>{
    const sessions=Object.values(day.sessions).sort((a,b)=>b.timestamp-a.timestamp);

    return `
      <div class="stocktake-day">
        <div class="stocktake-day-head" onclick="toggleStocktakeDay('stocktakeDay${dayIndex}',this)">
          <div>
            <b>Kiểm kê ngày ${esc(day.date)}</b>
            <div class="muted">${sessions.length} lần kiểm kê • ${sessions.reduce((n,s)=>n+s.rows.length,0)} dòng chênh lệch</div>
          </div>
          <div class="stocktake-day-summary">
            <span class="stocktake-chevron">▾</span>
          </div>
        </div>

        <div id="stocktakeDay${dayIndex}" class="stocktake-day-body ${dayIndex===0?'open':''}">
          ${sessions.map((session,sessionIndex)=>{
            const time=new Date(session.timestamp).toLocaleTimeString('vi-VN');
            return `
              <div class="stocktake-session">
                <div class="stocktake-session-head">
                  <div>
                    <b>Lần kiểm kê lúc ${time}</b>
                    <span class="muted"> • ${session.rows.length} nguyên liệu/ dụng cụ chênh lệch</span>
                  </div>
                  <div class="stocktake-day-summary">
                    ${session.positive>0?`<span class="badge okb">Tăng +${num(session.positive)}</span>`:''}
                    ${session.negative>0?`<span class="badge warnb">Giảm -${num(session.negative)}</span>`:''}
                  </div>
                </div>

                <div class="scroll">
                  <table>
                    <tr>
                      <th>Nguyên liệu/ Dụng cụ</th>
                      <th>Đơn vị</th>
                      <th class="right">Tồn trước</th>
                      <th class="right">Thực tế</th>
                      <th class="right">Chênh lệch</th>
                    </tr>
                    ${session.rows.map(m=>{
                      const ing=indexes.ingredientById.get(m.ingredient_id);
                      const meta=parseStocktakeMeta(m);
                      const unit=esc(ing?.unit||'');
                      return `<tr>
                        <td>${esc(ing?.name||'')}</td>
                        <td>${unit}</td>
                        <td class="right">${meta.before!=null?num(meta.before):'—'}</td>
                        <td class="right">${meta.actual!=null?num(meta.actual):'—'}</td>
                        <td class="right ${meta.diff<0?'neg':'ok'}">${meta.diff>0?'+':''}${num(meta.diff)}</td>
                      </tr>`;
                    }).join('')}
                  </table>
                </div>
              </div>`;
          }).join('')}

// stocktakeReceiptHistory: index.html lines 37511-37645
function stocktakeReceiptHistory(){
  const indexes=getDataIndexes();

  const rows=(
    indexes.movementsByWarehouseType.get(
      `${currentWarehouseId}|ADJUSTMENT`
    )||[]
  )
    .filter(m=>
      String(m.note||'').includes('Phiếu kiểm kê:')
    )
    .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));

  if(!rows.length)return '<div class="empty">Chưa có phiếu kiểm kê</div>';

  const days={};

  for(const m of rows){
    const note=String(m.note||'');
    const receipt=(note.match(/Phiếu kiểm kê:([^|]+)/i)?.[1]||m.reference_id||'Không số').trim();
    const savedDate=(note.match(/Ngày kiểm kê:([^|]+)/i)?.[1]||'').trim();

    let d=new Date(m.created_at||0);
    let dayKey=d.toLocaleDateString('vi-VN');
    let dayTs=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();

    if(/^\d{4}-\d{2}-\d{2}$/.test(savedDate)){
      const [y,mo,da]=savedDate.split('-').map(Number);
      dayKey=`${String(da).padStart(2,'0')}/${String(mo).padStart(2,'0')}/${y}`;
      dayTs=new Date(y,mo-1,da).getTime();
    }

    // Dùng cùng chuẩn key với Sửa/Xóa để lookup luôn khớp:
    // ref:<reference_id> hoặc legacy:<receipt>|<date>
    const key=stocktakeReceiptGroupKey(m);

    if(!days[dayKey])days[dayKey]={date:dayKey,timestamp:dayTs,receipts:{}};
    if(!days[dayKey].receipts[key]){
      days[dayKey].receipts[key]={receipt,key,timestamp:d.getTime(),rows:[]};
    }

    days[dayKey].receipts[key].rows.push(m);
    days[dayKey].receipts[key].timestamp=Math.max(days[dayKey].receipts[key].timestamp,d.getTime());
  }

  const groupedDays=Object.values(days).sort((a,b)=>b.timestamp-a.timestamp).slice(0,30);

  return groupedDays.map((day,dayIndex)=>{
    const receipts=Object.values(day.receipts).sort((a,b)=>b.timestamp-a.timestamp);

    // Phiếu mới: luôn trả đúng thứ tự/STT lúc kiểm kê.
    // Phiếu cũ chưa có metadata STT thì giữ thứ tự hiện có.
    for(const receipt of receipts){
      const withIndex=receipt.rows.map((row,index)=>({
        row,
        index,
        order:parseStocktakeMeta(row).lineOrder
      }));

      if(withIndex.some(x=>Number.isFinite(x.order))){
        withIndex.sort((a,b)=>{
          const ao=Number.isFinite(a.order)?a.order:Number.MAX_SAFE_INTEGER;
          const bo=Number.isFinite(b.order)?b.order:Number.MAX_SAFE_INTEGER;
          return ao===bo?a.index-b.index:ao-bo;
        });
        receipt.rows=withIndex.map(x=>x.row);
      }
    }

    return `
      <div class="stocktake-day">
        <div class="stocktake-day-head" onclick="toggleStocktakeDay('stocktakeDay${dayIndex}',this)">
          <div>
            <b>Ngày ${esc(day.date)}</b>
            <div class="muted">${receipts.length} phiếu kiểm kê</div>
          </div>
          <span class="stocktake-chevron">▸</span>
        </div>

        <div id="stocktakeDay${dayIndex}" class="stocktake-day-body">
          ${receipts.map((r,ri)=>{
            const encoded=encodeURIComponent(r.key);
            return `
            <div class="stocktake-session">
              <div class="stocktake-session-head">
                <div class="stocktake-session-click" onclick="toggleStocktakeDay('stocktakeReceipt${dayIndex}_${ri}',this.parentElement)">
                  <div>
                    <b>${esc(r.receipt)}</b>
                    ${(()=>{
                      const totalValue=r.rows.reduce((sum,m)=>sum+Number(parseStocktakeMeta(m).diffValue||0),0);
                      return `<div class="muted">${new Date(r.timestamp).toLocaleTimeString('vi-VN')} • ${r.rows.length} mặt hàng đã kiểm • Giá trị chênh lệch <b class="${totalValue<0?'neg':totalValue>0?'ok':''}">${totalValue>0?'+':''}${money(totalValue)}</b></div>`;
                    })()}
                  </div>
                  <span class="stocktake-chevron">▸</span>
                </div>

                <div class="stocktake-session-actions">
                  <button type="button" class="secondary sm" onclick="event.preventDefault();event.stopPropagation();editStocktakeReceipt('${encoded}')">Sửa</button>
                  <button type="button" class="danger sm" onclick="event.preventDefault();event.stopPropagation();deleteStocktakeReceipt('${encoded}')">Xóa</button>
                </div>
              </div>

              <div id="stocktakeReceipt${dayIndex}_${ri}" class="stocktake-day-body">
                <div class="scroll">
                  <table>
                    <tr>
                      <th>Nguyên liệu/ Dụng cụ</th>
                      <th>Đơn vị</th>
                      <th class="right">Tồn trước</th>
                      <th class="right">Thực tế</th>
                      <th class="right">Chênh lệch</th>
                      <th class="right">Đơn giá</th>
                      <th class="right">Thành tiền chênh lệch</th>
                    </tr>
                    ${r.rows.map(m=>{
                      const ing=db.ingredients.find(i=>i.id===m.ingredient_id);
                      const meta=parseStocktakeMeta(m);
                      const unit=ing?.unit||'';
                      const same=Math.abs(Number(meta.diff||0))<=0.000001;
                      return `<tr>
                        <td>${esc(ing?.name||'')}</td>
                        <td>${esc(unit)}</td>
                        <td class="right">${meta.before!=null?num(meta.before):'—'}</td>
                        <td class="right">${meta.actual!=null?num(meta.actual):'—'}</td>
                        <td class="right ${meta.diff<0?'neg':same?'':'ok'}">${same?'<span class="badge okb">Khớp</span>':`${meta.diff>0?'+':''}${num(meta.diff)}`}</td>
                        <td class="right">${money(meta.unitPrice||0)}</td>
                        <td class="right ${meta.diffValue<0?'neg':meta.diffValue>0?'ok':''}">${meta.diffValue>0?'+':''}${money(meta.diffValue||0)}</td>
                      </tr>`;
                    }).join('')}
                  </table>
                </div>
              </div>
            </div>
          `;
          }).join('')}

// compactAuditRows: index.html lines 43955-43973
function compactAuditRows(rows){
  const cutoff=Date.now()-AUDIT_LOG_MAX_AGE_DAYS*86400000;
  return (Array.isArray(rows)?rows:[])
    .filter(x=>{
      const t=Date.parse(x?.created_at||'');
      return !Number.isFinite(t)||t>=cutoff;
    })
    .slice(0,AUDIT_LOG_MAX_ROWS)
    .map(x=>({
      id:x.id,
      warehouse_id:x.warehouse_id||'',
      warehouse_name:compactText(x.warehouse_name||'',80),
      module:compactText(x.module||'Hệ thống',50),
      action:compactText(x.action||'Cập nhật',40),
      summary:compactText(x.summary||'',180),
      details:compactText(x.details||'',HISTORY_TEXT_MAX),
      created_at:x.created_at
    }));
}

// loadAuditLog: index.html lines 44026-44031
function loadAuditLog(){
  try{
    const x=JSON.parse(localStorage.getItem(AUDIT_LOG_KEY)||'[]');
    return Array.isArray(x)?x:[];
  }catch(e){return []}
}

// saveAuditLog: index.html lines 44033-44035
function saveAuditLog(rows){
  localStorage.setItem(AUDIT_LOG_KEY,JSON.stringify(compactAuditRows(rows)));
}

// auditLog: index.html lines 44037-44050
function auditLog(module,action,summary,details='',warehouseId=currentWarehouseId){
  const rows=loadAuditLog();
  rows.unshift({
    id:'audit_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
    warehouse_id:warehouseId||'',
    warehouse_name:compactText((db.warehouses||[]).find(w=>w.id===warehouseId)?.name||'',80),
    module:compactText(module||'Hệ thống',50),
    action:compactText(action||'Cập nhật',40),
    summary:compactText(summary||'',180),
    details:compactText(details||'',HISTORY_TEXT_MAX),
    created_at:new Date().toISOString()
  });
  saveAuditLog(rows);
}

// auditActionClass: index.html lines 44052-44058
function auditActionClass(action){
  const a=String(action||'').toLowerCase();
  if(a.includes('xóa'))return 'audit-delete';
  if(a.includes('thêm')||a.includes('tạo')||a.includes('nhập')||a.includes('bán'))return 'audit-create';
  if(a.includes('sửa')||a.includes('cập nhật')||a.includes('lưu'))return 'audit-update';
  return 'audit-neutral';
}

// auditFilterRows: index.html lines 44060-44078
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

// renderHistory: index.html lines 44080-44175
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

// v245PreNormalizeIntegrityAudit: index.html lines 50158-50187
function v245PreNormalizeIntegrityAudit(){
  const audit=
    v244LocalIntegrityAudit();

  const hardErrors=
    (audit.errors||[])
      .filter(
        x=>
          !v245RepairableIntegrityError(
            x
          )
      );

  const repairableErrors=
    (audit.errors||[])
      .filter(
        v245RepairableIntegrityError
      );

  return {
    ...audit,
    ok:hardErrors.length===0,
    errors:hardErrors,
    repairableErrors,
    originalErrors:
      audit.errors||[],
    collisions:
      v245TechnicalCollisionStats()
  };
}

// v244LocalIntegrityAudit: index.html lines 51295-51676
function v244LocalIntegrityAudit(){
  const errors=[];
  const warnings=[];

  const warehouses=
    new Set(
      (db.warehouses||[])
        .map(x=>String(x.id||''))
    );

  const ingredients=
    new Set(
      (db.ingredients||[])
        .map(x=>String(x.id||''))
    );

  const suppliers=
    new Set(
      (db.suppliers||[])
        .map(x=>String(x.id||''))
    );

  const products=
    new Set(
      (db.products||[])
        .map(x=>String(x.id||''))
    );

  const sales=
    new Set(
      (db.sales||[])
        .map(x=>String(x.id||''))
    );

  v244DuplicateKeys(
    db.warehouses,
    x=>x.id,
    'Kho',
    errors
  );

  v244DuplicateKeys(
    db.ingredients,
    x=>x.id,
    'Nguyên liệu',
    errors
  );

  v244DuplicateKeys(
    db.suppliers,
    x=>x.id,
    'Nhà cung cấp',
    errors
  );

  v244DuplicateKeys(
    db.products,
    x=>x.id,
    'Sản phẩm',
    errors
  );

  v244DuplicateKeys(
    db.inventory,
    x=>`${x.warehouse_id}|${x.ingredient_id}`,
    'Tồn kho',
    errors
  );

  v244DuplicateKeys(
    db.recipeItems,
    x=>x.id,
    'Công thức',
    errors
  );

  v244DuplicateKeys(
    db.preparedItems,
    x=>x.id,
    'Pha chế',
    errors
  );

  v244DuplicateKeys(
    db.sales,
    x=>x.id,
    'Phiếu bán',
    errors
  );

  v244DuplicateKeys(
    db.saleItems,
    x=>x.id,
    'Chi tiết bán',
    errors
  );

  v244DuplicateKeys(
    (db.movements||[])
      .filter(x=>
        x?._stocktake_audit_only!==true
      ),
    x=>x.id,
    'Biến động',
    errors
  );

  for(const row of db.inventory||[]){
    if(!warehouses.has(String(row.warehouse_id||''))){
      errors.push(
        `Tồn kho ${row.ingredient_id}: không tìm thấy kho ${row.warehouse_id}`
      );
    }

    if(!ingredients.has(String(row.ingredient_id||''))){
      errors.push(
        `Tồn kho: không tìm thấy nguyên liệu ${row.ingredient_id}`
      );
    }

    v244Finite(
      row.quantity,
      `Tồn kho ${row.ingredient_id}`,
      errors
    );

    v244Timestamp(
      row.updated_at,
      `Tồn kho ${row.ingredient_id}`,
      errors
    );
  }

  for(const row of db.ingredients||[]){
    v244Finite(
      row.cost||0,
      `Giá nguyên liệu ${row.name||row.id}`,
      errors
    );

    v244Finite(
      row.minimum_stock||0,
      `Tồn tối thiểu ${row.name||row.id}`,
      errors
    );

    v244Finite(
      row.batch_output_qty||1,
      `Mẻ pha chế ${row.name||row.id}`,
      errors
    );

    v244Timestamp(
      row.updated_at,
      `Nguyên liệu ${row.name||row.id}`,
      errors
    );
  }

  for(const row of db.products||[]){
    v244Finite(
      row.selling_price||0,
      `Giá bán ${row.name||row.id}`,
      errors
    );
  }

  for(const row of db.recipeItems||[]){
    if(!products.has(String(row.product_id||''))){
      errors.push(
        `Công thức ${row.id}: món ${row.product_id} không tồn tại`
      );
    }

    if(!ingredients.has(String(row.ingredient_id||''))){
      errors.push(
        `Công thức ${row.id}: nguyên liệu ${row.ingredient_id} không tồn tại`
      );
    }

    v244Finite(
      row.quantity,
      `Công thức ${row.id}`,
      errors
    );
  }

  for(const row of db.preparedItems||[]){
    if(
      !ingredients.has(
        String(
          row.prepared_ingredient_id||''
        )
      )
    ){
      errors.push(
        `Pha chế ${row.id}: thành phẩm không tồn tại`
      );
    }

    if(
      !ingredients.has(
        String(
          row.source_ingredient_id||''
        )
      )
    ){
      errors.push(
        `Pha chế ${row.id}: nguyên liệu nguồn không tồn tại`
      );
    }

    v244Finite(
      row.quantity,
      `Pha chế ${row.id}`,
      errors
    );
  }

  for(const row of db.sales||[]){
    if(!warehouses.has(String(row.warehouse_id||''))){
      errors.push(
        `Phiếu bán ${row.id}: kho ${row.warehouse_id} không tồn tại`
      );
    }

    v244Finite(
      row.total_amount||0,
      `Phiếu bán ${row.id}`,
      errors
    );

    v244Timestamp(
      row.sold_at||
      row.created_at,
      `Phiếu bán ${row.id}`,
      errors
    );
  }

  for(const row of db.saleItems||[]){
    if(!sales.has(String(row.sale_id||''))){
      errors.push(
        `Chi tiết bán ${row.id}: phiếu ${row.sale_id} không tồn tại`
      );
    }

    if(!products.has(String(row.product_id||''))){
      errors.push(
        `Chi tiết bán ${row.id}: món ${row.product_id} không tồn tại`
      );
    }

    v244Finite(
      row.quantity,
      `Chi tiết bán ${row.id} số lượng`,
      errors
    );

    v244Finite(
      row.unit_price||0,
      `Chi tiết bán ${row.id} đơn giá`,
      errors
    );
  }

  for(const row of db.movements||[]){
    if(row?._stocktake_audit_only===true){
      continue;
    }

    if(!warehouses.has(String(row.warehouse_id||''))){
      errors.push(
        `Biến động ${row.id}: kho ${row.warehouse_id} không tồn tại`
      );
    }

    if(!ingredients.has(String(row.ingredient_id||''))){
      errors.push(
        `Biến động ${row.id}: nguyên liệu ${row.ingredient_id} không tồn tại`
      );
    }

    if(
      row.supplier_id &&
      !suppliers.has(
        String(row.supplier_id)
      )
    ){
      errors.push(
        `Biến động ${row.id}: NCC ${row.supplier_id} không tồn tại`
      );
    }

    const type=
      normalizeTransactionTypeV200(
        row.transaction_type
      );

    if(!type){
      errors.push(
        `Biến động ${row.id}: loại giao dịch ${row.transaction_type||'(trống)'} không hợp lệ`
      );
    }

    if(
      type==='SALE' &&
      row.reference_id &&
      !sales.has(
        String(row.reference_id)
      )
    ){
      errors.push(
        `Biến động SALE ${row.id}: phiếu bán ${row.reference_id} không tồn tại`
      );
    }

    v244Finite(
      row.quantity,
      `Biến động ${row.id} số lượng`,
      errors
    );

    if(row.unit_cost!=null){
      v244Finite(
        row.unit_cost,
        `Biến động ${row.id} đơn giá`,
        errors
      );
    }

    if(row.total_cost!=null){
      v244Finite(
        row.total_cost,
        `Biến động ${row.id} thành tiền`,
        errors
      );
    }

    v244Timestamp(
      row.created_at,
      `Biến động ${row.id}`,
      errors
    );
  }

  if(
    currentWarehouseId &&
    !warehouses.has(
      String(currentWarehouseId)
    )
  ){
    errors.push(
      `Kho đang chọn ${currentWarehouseId} không tồn tại`
    );
  }

  return {
    ok:errors.length===0,
    errors,
    warnings,
    summary:{
      warehouses:(db.warehouses||[]).length,
      ingredients:(db.ingredients||[]).length,
      suppliers:(db.suppliers||[]).length,
      products:(db.products||[]).length,
      inventory:(db.inventory||[]).length,
      recipe_items:(db.recipeItems||[]).length,
      prepared_items:(db.preparedItems||[]).length,
      sales:(db.sales||[]).length,
      sale_items:(db.saleItems||[]).length,
      movements:(db.movements||[])
        .filter(x=>
          x?._stocktake_audit_only!==true
        ).length,
      audit_only_movements:(db.movements||[])
        .filter(x=>
          x?._stocktake_audit_only===true
        ).length
    }
  };
}

// lyFreshSaleHistoryTime: index.html lines 57613-57630
function lyFreshSaleHistoryTime(value){
  if(!value)return '—';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '—';

  return new Intl.DateTimeFormat(
    'vi-VN',
    {
      day:'2-digit',
      month:'2-digit',
      year:'numeric',
      hour:'2-digit',
      minute:'2-digit',
      second:'2-digit',
      hour12:false
    }
  ).format(d);
}

})();
