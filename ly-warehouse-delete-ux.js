(()=>{
'use strict';
const VERSION='2026.08.24.1';
if(window.__lyWarehouseDeleteUX?.version===VERSION)return;
const text=v=>String(v??'').trim();
const friendlyForeignKey=error=>{
  const raw=text(error?.message||error);
  const code=text(error?.code);
  return code==='23503'||/foreign key|violates.*constraint|ly_.*_warehouse_id_fkey/i.test(raw);
};
function currentDb(){try{return typeof db!=='undefined'?db:window.db}catch(e){return window.db}}
function currentOrg(){return text(window.__lyFreshOrgId||'');}
function getClient(){try{return typeof sb!=='undefined'?sb:window.sb}catch(e){return window.sb}}
function warehouseName(id){return currentDb()?.warehouses?.find?.(x=>String(x.id)===String(id))?.name||'kho này';}
function showBlocked(id){
  alert(`Không thể xóa “${warehouseName(id)}” vì kho đã có lịch sử nhập/xuất/kiểm kê/bán hàng. Hệ thống giữ kho để bảo toàn dữ liệu và báo cáo. Nếu không còn sử dụng, hãy giữ kho này thay vì xóa.`);
}
async function safeDeleteWarehouse(id){
  const legacy=currentDb();
  if(!legacy?.warehouses?.some?.(x=>String(x.id)===String(id)))return alert('Không tìm thấy kho.');
  if((legacy.warehouses||[]).length<=1)return alert('Không thể xóa kho cuối cùng. Hệ thống cần ít nhất 1 kho/chi nhánh.');
  if(!confirm(`Xóa “${warehouseName(id)}”? Chỉ kho chưa từng có giao dịch mới có thể xóa.`))return;
  const client=getClient(),org=currentOrg();
  if(!client?.from)return alert('Chưa kết nối Cloud. Vui lòng thử lại sau.');
  try{
    let q=client.from('ly_warehouses').delete().eq('id',id);if(org)q=q.eq('org_id',org);
    const {error}=await q;
    if(error){if(friendlyForeignKey(error)||/Kho đang có phiếu liên quan/i.test(text(error.message)))return showBlocked(id);throw error;}
    if(typeof window.loadCloud==='function')await window.loadCloud();else try{if(typeof loadCloud==='function')await loadCloud()}catch(e){}
    if(typeof window.toastMsg==='function')window.toastMsg('Đã xóa kho');else try{if(typeof toastMsg==='function')toastMsg('Đã xóa kho')}catch(e){}
  }catch(error){
    if(friendlyForeignKey(error)||/Kho đang có phiếu liên quan/i.test(text(error?.message)))return showBlocked(id);
    console.warn('[Lát Yên] warehouse delete',error);
    alert('Không thể xóa kho lúc này. Vui lòng thử lại.');
  }
}
function install(){
  try{window.deleteWarehouse=safeDeleteWarehouse;window.confirmDeleteWarehouse=safeDeleteWarehouse;}catch(e){}
  try{deleteWarehouse=safeDeleteWarehouse;confirmDeleteWarehouse=safeDeleteWarehouse;}catch(e){}
  return true;
}
install();[250,800,1800,3500].forEach(ms=>setTimeout(install,ms));window.addEventListener('focus',install);
window.__lyWarehouseDeleteUX={version:VERSION,install,status:()=>({version:VERSION,installed:true})};
})();
