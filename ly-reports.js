/* Lát Yên — Reports UI V1
   Extracted from Legacy index.html. Report calculations/charts remain in Legacy core. */
(()=>{
  'use strict';
  if(window.__lyReportsModule)return;
  window.__lyReportsModule={version:'2026.08.23.1'};

  function renderReports(){
    let start=new Date();
    start.setHours(0,0,0,0);
    start.setDate(start.getDate()-29);
  
    let sales30=(db.sales||[]).filter(s=>
      s.warehouse_id===currentWarehouseId &&
      new Date(s.sold_at)>=start
    );
  
    let rev=0,qty=0,cost=0,by={},daily={};
  
    // Tạo đủ 30 ngày để biểu đồ không bị mất ngày không có doanh thu
    for(let d=0;d<30;d++){
      let x=new Date(start);
      x.setDate(start.getDate()+d);
      let key=x.toISOString().slice(0,10);
      daily[key]={date:key,revenue:0,qty:0};
    }
  
    for(const s of sales30){
      rev+=Number(s.total_amount||0);
      let day=new Date(s.sold_at).toISOString().slice(0,10);
      if(!daily[day])daily[day]={date:day,revenue:0,qty:0};
      daily[day].revenue+=Number(s.total_amount||0);
  
      for(const si of (db.saleItems||[]).filter(x=>x.sale_id===s.id)){
        let p=db.products.find(x=>x.id===si.product_id);
        let q=Number(si.quantity||0);
        qty+=q;
        daily[day].qty+=q;
  
        let c=p?productCost(p)*q:0;
        cost+=c;
  
        let n=p?.name||'Món đã xóa';
        let x=by[n]||(by[n]={qty:0,rev:0,cost:0});
        x.qty+=q;
        x.rev+=Number(si.unit_price||0)*q;
        x.cost+=c;
      }
    }
  
    let ranked=Object.entries(by).sort((a,b)=>b[1].qty-a[1].qty);
    let best=ranked[0];
    let avgTicket=sales30.length?rev/sales30.length:0;
  
    E.reports.innerHTML=`
      <div class="toolbar">
        <button class="secondary" onclick="exportSalesCsv()">Xuất doanh thu CSV</button>
        <button class="secondary" onclick="exportMovementsCsv()">Xuất biến động CSV</button>
      </div>
  
      <h2>Báo cáo 30 ngày — ${esc(warehouse()?.name||'')}</h2>
  
      <div class="grid">
        <div class="card metric">
          <span class="muted">Tổng số món bán</span>
          <div class="value">${num(qty)}</div>
        </div>
        <div class="card metric">
          <span class="muted">Số giao dịch</span>
          <div class="value">${num(sales30.length)}</div>
        </div>
        <div class="card metric">
          <span class="muted">Doanh thu</span>
          <div class="value" style="font-size:22px">${money(rev)}</div>
        </div>
        <div class="card metric">
          <span class="muted">Giá trị TB/giao dịch</span>
          <div class="value" style="font-size:22px">${money(avgTicket)}</div>
        </div>
        <div class="card metric">
          <span class="muted">Giá vốn NVL*</span>
          <div class="value" style="font-size:22px">${money(cost)}</div>
        </div>
        <div class="card metric">
          <span class="muted">Lãi gộp*</span>
          <div class="value profit" style="font-size:22px">${money(rev-cost)}</div>
        </div>
      </div>
  
      <div class="grid section-gap">
        <div class="card">
          <h3>Doanh thu theo ngày</h3>
          <div class="muted">30 ngày gần nhất</div>
          <canvas id="revenueChart" height="220" style="width:100%;max-height:260px"></canvas>
        </div>
  
        <div class="card">
          <h3>Số lượng món bán theo ngày</h3>
          <div class="muted">Tổng số món/ly mỗi ngày</div>
          <canvas id="quantityChart" height="220" style="width:100%;max-height:260px"></canvas>
        </div>
      </div>
  
      <div class="grid section-gap">
        <div class="card">
          <h3>Top món bán chạy</h3>
          ${best
            ? `<div style="font-size:26px;font-weight:800;margin:12px 0">${esc(best[0])}</div>
               <div class="muted">Đã bán <b>${num(best[1].qty)}</b> • Doanh thu ${money(best[1].rev)}</div>`
            : '<div class="empty">Chưa có dữ liệu bán hàng</div>'}
          <canvas id="bestSellerChart" height="240" style="width:100%;max-height:300px"></canvas>
        </div>
  
        <div class="card">
          <h3>Cơ cấu số lượng món bán</h3>
          <div id="salesMixBars"></div>
        </div>
      </div>
  
      <div class="card section-gap">
        <h3>Thống kê chi tiết theo món</h3>
        ${ranked.length?`
          <div class="scroll">
            <table class="product-performance-table" data-ly-table-view="productPerformance">
              <tr>
                <th>#</th>
                <th>Món</th>
                <th class="right">Số lượng bán</th>
                <th class="right">Doanh thu</th>
                <th class="right">Giá vốn</th>
                <th class="right">Lãi gộp</th>
                <th class="right">Tỷ trọng SL</th>
              </tr>
              ${ranked.map(([n,x],idx)=>`
                <tr>
                  <td>${idx+1}</td>
                  <td><b>${esc(n)}</b>${idx===0?'<span class="badge" style="margin-left:8px">Bán chạy</span>':''}</td>
                  <td class="right"><b>${num(x.qty)}</b></td>
                  <td class="right">${money(x.rev)}</td>
                  <td class="right">${money(x.cost)}</td>
                  <td class="right profit">${money(x.rev-x.cost)}</td>
                  <td class="right">${qty?num(x.qty/qty*100):0}%</td>
                </tr>
              `).join('')}
            </table>
          </div>`
          : '<div class="empty">Chưa có dữ liệu</div>'}
  
        <div class="footer-note">
          * Giá vốn đang tính theo giá vốn bình quân hiện tại của nguyên liệu/ dụng cụ.
        </div>
      </div>
    `;
  
    (window.queueMicrotask||window.setTimeout)?.(()=>window.__lyTableViewV2?.apply?.(E.reports),0);
    const dailyRows=Object.values(daily).sort((a,b)=>a.date.localeCompare(b.date));
    setTimeout(()=>drawReportCharts(dailyRows,ranked),0);
  }

  window.__lyReportsModule.renderReports=renderReports;
})();
