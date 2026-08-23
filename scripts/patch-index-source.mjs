import fs from 'node:fs/promises';

const VERSION='2.1.0';
const path='index.html';
let html=await fs.readFile(path,'utf8');
const original=html;

html=html.replace(
  /<span class="badge">V274<\/span>/,
  `<span class="badge" id="appVersionStatic">Ver ${VERSION}</span>`
);
html=html.replace(
  /<span class="badge" id="appVersionStatic">Ver [^<]+<\/span>/,
  `<span class="badge" id="appVersionStatic">Ver ${VERSION}</span>`
);

const legacyDelete=`deleteWarehouse=async function(id){
  if(db.warehouses.length<=1)return alert('Phải giữ ít nhất một kho.');
  if(!confirm('Xóa kho này? Chỉ thực hiện được khi kho chưa có phiếu liên quan.'))return;
  const {error}=await sb.from('ly_warehouses').delete().eq('id',id).eq('org_id',window.__lyFreshOrgId);
  if(error)return alert('Không thể xóa kho: '+error.message);
  await loadCloud();toastMsg('Đã xóa kho');
};
confirmDeleteWarehouse=deleteWarehouse;`;

const v2Delete=`deleteWarehouse=async function(id){
  if(db.warehouses.length<=1)return alert('Phải giữ ít nhất một kho.');
  if(!confirm('Xóa kho này? Kho đã có lịch sử nhập/xuất/kiểm kê/bán hàng sẽ được giữ lại để bảo toàn dữ liệu.'))return;
  try{
    const core=window.__lyFreshCoreV2;
    if(!core?.domains?.masterData?.removeWarehouse){
      return alert('Fresh Core V2 chưa sẵn sàng. Vui lòng thử lại sau vài giây.');
    }
    await core.domains.masterData.removeWarehouse(id);
    await core.domains.inventory?.refresh?.();
    window.__lyFreshCoreV2LegacyHydration?.hydrate?.();
    if(typeof invalidateDataIndexes==='function')invalidateDataIndexes();
    if(typeof invalidateDerivedCaches==='function')invalidateDerivedCaches();
    if(typeof renderWarehouseSelect==='function')renderWarehouseSelect();
    if(typeof renderAll==='function')renderAll();
    toastMsg('Đã xóa kho');
  }catch(error){
    const message=String(error?.message||error||'Không xác định');
    if(/phiếu liên quan|foreign key|still referenced|23503/i.test(message)){
      return alert('Không thể xóa kho này vì đã có lịch sử nhập/xuất/kiểm kê/bán hàng. Hệ thống giữ kho để bảo toàn lịch sử dữ liệu.');
    }
    alert('Không thể xóa kho: '+message);
  }
};
confirmDeleteWarehouse=deleteWarehouse;`;

if(html.includes(legacyDelete))html=html.replace(legacyDelete,v2Delete);
else if(!html.includes("Fresh Core V2 chưa sẵn sàng. Vui lòng thử lại sau vài giây.")){
  throw new Error('Không tìm thấy Legacy warehouse delete override cần thay thế');
}

if(!html.includes(`id="appVersionStatic">Ver ${VERSION}</span>`))throw new Error('Không thể gắn version tĩnh vào index.html');
if(html.includes("if(error)return alert('Không thể xóa kho: '+error.message);"))throw new Error('Legacy warehouse delete override vẫn còn');

if(html!==original){
  await fs.writeFile(path,html,'utf8');
  console.log(`Patched source index.html for Ver ${VERSION} + V2 warehouse delete`);
}else console.log('index.html source already patched');
