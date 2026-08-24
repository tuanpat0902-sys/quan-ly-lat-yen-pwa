(()=>{
'use strict';
const VERSION='2026.08.24.3';
if(window.__lyWarehouseDeleteUX?.version===VERSION)return;
const text=v=>String(v??'').trim();
const html=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=id=>document.getElementById(id);
const statusCache=new Map();
function getDb(){try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db}}
function getClient(){try{return typeof sb!=='undefined'?sb:window.sb}catch(_){return window.sb}}
function warehouse(id){return getDb()?.warehouses?.find?.(x=>String(x.id)===String(id))||null}
function message(error,fallback){return text(error?.message||error)||fallback}
function notify(value){try{if(typeof toastMsg==='function')return toastMsg(value)}catch(_){} alert(value)}
function close(){try{if(typeof closeModal==='function')closeModal()}catch(_){} }
async function refresh(){try{if(typeof loadCloud==='function')await loadCloud()}catch(error){console.warn('[Lát Yên] refresh warehouse',error)}}
function open(content){if(typeof window.openModal==='function')window.openModal(content);else alert('Không mở được biểu mẫu kho.')}

async function passwordStatus(id,force=false){
  if(!id)return {has_password:false};
  if(!force&&statusCache.has(id))return statusCache.get(id);
  const client=getClient();
  if(!client?.rpc)throw new Error('Chưa kết nối Cloud.');
  const {data,error}=await client.rpc('ly_warehouse_password_status',{p_warehouse_id:id});
  if(error)throw error;
  const result={has_password:Boolean(data?.has_password)};
  statusCache.set(id,result);
  return result;
}

function syncPasswordFields(){
  const enabled=Boolean(byId('wPasswordEnabled')?.checked);
  const protectedNow=byId('wPasswordEnabled')?.dataset.protected==='1';
  byId('wPasswordFields')?.classList.toggle('is-hidden',!enabled);
  byId('wCurrentPasswordWrap')?.classList.toggle('is-hidden',!protectedNow||(!enabled&&false));
  const hint=byId('wPasswordHint');
  if(hint)hint.textContent=protectedNow
    ?(enabled?'Để trống mật khẩu mới nếu chỉ sửa thông tin kho.':'Nhập mật khẩu hiện tại để tắt bảo vệ.')
    :(enabled?'Mật khẩu mới gồm 4–64 ký tự.':'Khi xóa vẫn phải nhập đúng tên kho để xác nhận.');
}

async function secureWarehouseModal(id=''){
  const w=warehouse(id)||{name:'',address:''};
  open(`
    <div class="modal-head"><h3>${id?'Sửa':'Thêm'} kho / chi nhánh</h3><button class="x" type="button" onclick="closeModal()">×</button></div>
    <div class="form-grid ly-warehouse-form">
      <div><label>Tên kho / chi nhánh</label><input id="wName" value="${html(w.name)}" autocomplete="off"></div>
      <div class="full"><label>Địa chỉ</label><input id="wAddress" value="${html(w.address||'')}" autocomplete="off"></div>
      <section class="full ly-warehouse-security">
        <label class="ly-security-toggle"><input id="wPasswordEnabled" type="checkbox"><span><b>Bảo vệ kho bằng mật khẩu</b><small>Yêu cầu mật khẩu khi xóa kho hoặc thay đổi thiết lập bảo vệ.</small></span></label>
        <div id="wCurrentPasswordWrap" class="is-hidden"><label>Mật khẩu hiện tại</label><input id="wCurrentPassword" type="password" autocomplete="current-password" maxlength="64"></div>
        <div id="wPasswordFields" class="is-hidden ly-password-grid">
          <div><label>${id?'Mật khẩu mới':'Mật khẩu kho'}</label><input id="wNewPassword" type="password" autocomplete="new-password" maxlength="64"></div>
          <div><label>Nhập lại mật khẩu</label><input id="wConfirmPassword" type="password" autocomplete="new-password" maxlength="64"></div>
        </div>
        <p id="wPasswordHint" class="muted">Khi xóa vẫn phải nhập đúng tên kho để xác nhận.</p>
      </section>
    </div>
    <button id="saveWarehouseBtn" class="primary section-gap" type="button">${id?'Lưu thay đổi':'Tạo kho mới'}</button>
  `);
  byId('wPasswordEnabled')?.addEventListener('change',syncPasswordFields);
  byId('saveWarehouseBtn')?.addEventListener('click',()=>saveWarehouseSecure(id));
  if(id){
    try{
      const state=await passwordStatus(id,true);
      const toggle=byId('wPasswordEnabled');
      if(!toggle)return;
      toggle.checked=state.has_password;
      toggle.dataset.protected=state.has_password?'1':'0';
      syncPasswordFields();
    }catch(error){
      alert('Không đọc được trạng thái bảo vệ kho: '+message(error,'Vui lòng thử lại.'));
      close();
    }
  }
}

async function saveWarehouseSecure(id=''){
  const name=text(byId('wName')?.value),address=text(byId('wAddress')?.value);
  const toggle=byId('wPasswordEnabled'),enabled=Boolean(toggle?.checked),protectedNow=toggle?.dataset.protected==='1';
  const current=byId('wCurrentPassword')?.value||'',next=byId('wNewPassword')?.value||'',confirmNext=byId('wConfirmPassword')?.value||'';
  if(!name)return alert('Nhập tên kho.');
  let mode='keep';
  if(protectedNow&&!enabled)mode='remove';
  else if(enabled&&(!protectedNow||next))mode='set';
  if(mode==='set'){
    if(next.length<4||next.length>64)return alert('Mật khẩu kho phải có từ 4 đến 64 ký tự.');
    if(next!==confirmNext)return alert('Mật khẩu nhập lại chưa khớp.');
  }
  if((mode==='remove'||(mode==='set'&&protectedNow))&&!current)return alert('Nhập mật khẩu hiện tại.');
  const btn=byId('saveWarehouseBtn');
  if(btn){btn.disabled=true;btn.textContent=id?'Đang lưu…':'Đang tạo…'}
  try{
    const client=getClient();if(!client?.rpc)throw new Error('Chưa kết nối Cloud.');
    const row={id:id||null,name,address,active:true};
    const {data,error}=await client.rpc('ly_save_warehouse_secure',{p_warehouse:row,p_password_mode:mode,p_current_password:current||null,p_new_password:next||null});
    if(error)throw error;
    const warehouseId=data?.id;if(!warehouseId)throw new Error('Cloud chưa trả về mã kho.');
    statusCache.set(warehouseId,{has_password:Boolean(data?.has_password)});
    try{currentWarehouseId=warehouseId}catch(_){window.currentWarehouseId=warehouseId}
    await refresh();close();notify(id?'Đã lưu thay đổi kho':'Đã tạo kho mới');
  }catch(error){alert('Không thể lưu kho: '+message(error,'Vui lòng thử lại.'))}
  finally{if(btn){btn.disabled=false;btn.textContent=id?'Lưu thay đổi':'Tạo kho mới'}}
}

function usageFor(id){
  const headers=window.__lyFreshHeaders||{};
  const count=rows=>(rows||[]).filter(x=>String(x.warehouse_id)===String(id)).length;
  return {imports:count(headers.imports),exports:count(headers.exports),stocktakes:count(headers.stocktakes),sales:count(headers.sales),cashflow:count(window.__lyFreshCashflow)};
}

async function secureDeleteWarehouse(id){
  const w=warehouse(id);if(!w)return alert('Không tìm thấy kho.');
  if((getDb()?.warehouses||[]).length<=1)return alert('Không thể xóa kho cuối cùng. Hệ thống cần ít nhất một kho/chi nhánh.');
  try{
    const state=await passwordStatus(id,true),usage=usageFor(id);
    open(`
      <div class="modal-head"><h3>Xóa kho / chi nhánh</h3><button class="x" type="button" onclick="closeModal()">×</button></div>
      <div class="ly-delete-warning"><b>Thao tác này không thể hoàn tác.</b><p>Toàn bộ giao dịch, tồn kho, sản phẩm, phiếu nhập/xuất/kiểm kê và dữ liệu bán hàng thuộc <b>“${html(w.name)}”</b> sẽ bị xóa.</p></div>
      <div class="ly-delete-counts"><span>Nhập: <b>${usage.imports}</b></span><span>Xuất: <b>${usage.exports}</b></span><span>Kiểm kê: <b>${usage.stocktakes}</b></span><span>Bán hàng: <b>${usage.sales}</b></span></div>
      ${state.has_password?'<div class="section-gap"><label>Mật khẩu kho</label><input id="deleteWarehousePassword" type="password" autocomplete="current-password" maxlength="64"></div>':''}
      <div class="section-gap"><label>Nhập chính xác tên kho để xác nhận</label><input id="deleteWarehouseName" autocomplete="off" placeholder="${html(w.name)}"></div>
      <button id="executeWarehouseDeleteBtn" class="danger section-gap" type="button">Xóa vĩnh viễn kho và dữ liệu</button>
    `);
    byId('executeWarehouseDeleteBtn')?.addEventListener('click',()=>executeWarehouseDelete(id,w.name,state.has_password));
  }catch(error){alert('Không đọc được trạng thái kho: '+message(error,'Vui lòng thử lại.'))}
}

async function executeWarehouseDelete(id,name,protectedWarehouse){
  if(text(byId('deleteWarehouseName')?.value)!==text(name))return alert('Tên kho xác nhận chưa chính xác.');
  const password=byId('deleteWarehousePassword')?.value||'';
  if(protectedWarehouse&&!password)return alert('Nhập mật khẩu kho.');
  const btn=byId('executeWarehouseDeleteBtn');if(btn){btn.disabled=true;btn.textContent='Đang xóa dữ liệu…'}
  try{
    const client=getClient();if(!client?.rpc)throw new Error('Chưa kết nối Cloud.');
    const {data,error}=await client.rpc('ly_delete_warehouse_secure',{p_warehouse_id:id,p_password:password||null});
    if(error)throw error;
    statusCache.delete(id);await refresh();close();
    const total=['imports','exports','stocktakes','sales','cashflow'].reduce((sum,key)=>sum+Number(data?.[key]||0),0);
    notify(`Đã xóa kho “${name}” cùng ${total} bản ghi nghiệp vụ chính.`);
    try{if(typeof auditLog==='function')auditLog('Xóa kho và dữ liệu',`${name} · ${total} bản ghi`)}catch(_){}
  }catch(error){alert('Không thể xóa kho: '+message(error,'Vui lòng thử lại.'))}
  finally{if(btn){btn.disabled=false;btn.textContent='Xóa vĩnh viễn kho và dữ liệu'}}
}

function install(){
  window.warehouseModal=secureWarehouseModal;
  window.saveWarehouse=saveWarehouseSecure;
  window.deleteWarehouse=secureDeleteWarehouse;
  window.confirmDeleteWarehouse=secureDeleteWarehouse;
  try{warehouseModal=secureWarehouseModal;saveWarehouse=saveWarehouseSecure;deleteWarehouse=secureDeleteWarehouse;confirmDeleteWarehouse=secureDeleteWarehouse}catch(_){}
}
install();[250,800,1800,3500].forEach(ms=>setTimeout(install,ms));window.addEventListener('focus',install);
window.__lyWarehouseDeleteUX={version:VERSION,install,passwordStatus,status:()=>({version:VERSION,installed:true})};
})();
