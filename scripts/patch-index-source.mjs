import fs from 'node:fs/promises';

const VERSION='2.1.1';
const INDEX='index.html';
const SW='sw.js';
let html=await fs.readFile(INDEX,'utf8');
const originalHtml=html;

html=html.replace(/<span class="badge">V274<\/span>/,`<span class="badge" id="appVersionStatic">Ver ${VERSION}</span>`);
html=html.replace(/<span class="badge" id="appVersionStatic">Ver [^<]+<\/span>/,`<span class="badge" id="appVersionStatic">Ver ${VERSION}</span>`);

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
    if(!core?.domains?.masterData?.removeWarehouse)return alert('Fresh Core V2 chưa sẵn sàng. Vui lòng thử lại sau vài giây.');
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
    if(/phiếu liên quan|foreign key|still referenced|23503/i.test(message))return alert('Không thể xóa kho này vì đã có lịch sử nhập/xuất/kiểm kê/bán hàng. Hệ thống giữ kho để bảo toàn lịch sử dữ liệu.');
    alert('Không thể xóa kho: '+message);
  }
};
confirmDeleteWarehouse=deleteWarehouse;`;
if(html.includes(legacyDelete))html=html.replace(legacyDelete,v2Delete);

const versionInfo=`\n<script id="lyVersionInfoInline">(()=>{const APP_VERSION='${VERSION}',REVISION='fresh-core-v2-authoritative-v2';function render(){const root=document.getElementById('settings');if(!root)return false;let card=document.getElementById('lyVersionInfoCard');if(!card){card=document.createElement('div');card.id='lyVersionInfoCard';card.className='card';root.appendChild(card);}const core=window.__lyFreshCoreV2||{},fo=window.__lyFreshCoreV2FinalOwnership||{},loader=window.__lyModuleLoader||{};card.innerHTML='<h3>Thông tin phiên bản</h3><div style="font-size:20px;font-weight:850;color:#0f766e;margin:8px 0">Ver '+APP_VERSION+'</div><table style="width:100%;border-collapse:collapse"><tbody><tr><td style="padding:8px;font-weight:700">App version</td><td style="padding:8px">'+APP_VERSION+'</td></tr><tr><td style="padding:8px;font-weight:700">Revision</td><td style="padding:8px">'+REVISION+'</td></tr><tr><td style="padding:8px;font-weight:700">Fresh Core V2</td><td style="padding:8px">'+(core.mode||core.version||'authoritative')+'</td></tr><tr><td style="padding:8px;font-weight:700">Final ownership</td><td style="padding:8px">'+(fo.version||'authoritative')+'</td></tr><tr><td style="padding:8px;font-weight:700">Module loader</td><td style="padding:8px">'+(loader.version||'đang tải')+'</td></tr><tr><td style="padding:8px;font-weight:700">Service Worker</td><td style="padding:8px;word-break:break-all">'+(navigator.serviceWorker?.controller?.scriptURL||'chưa có controller')+'</td></tr><tr><td style="padding:8px;font-weight:700">Tải trang lúc</td><td style="padding:8px">'+new Date().toLocaleString('vi-VN')+'</td></tr></tbody></table>';return true;}function boot(){render();document.addEventListener('click',e=>{const b=e.target?.closest?.('button[data-panel]');if(b?.dataset?.panel==='settings')setTimeout(render,50)},true);window.addEventListener('latyen:panel',e=>{if(e?.detail?.panel==='settings')setTimeout(render,50)});}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();window.__lyVersionInfo={version:APP_VERSION,revision:REVISION,render};})();</script>\n`;
html=html.replace(/\n<script id="lyVersionInfoInline">[\s\S]*?<\/script>\n/i,'\n');
html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,versionInfo+'\n</body>'):html+versionInfo;

if(!html.includes(`id="appVersionStatic">Ver ${VERSION}</span>`))throw new Error('Version badge source patch failed');
if(html.includes("if(error)return alert('Không thể xóa kho: '+error.message);"))throw new Error('Legacy warehouse delete override remains');
if(!html.includes('id="lyVersionInfoInline"'))throw new Error('Version info inline block missing');
if(html!==originalHtml)await fs.writeFile(INDEX,html,'utf8');

let sw=await fs.readFile(SW,'utf8');
const originalSw=sw;
sw=sw.replace(/const CACHE='[^']+';/,"const CACHE='lat-yen-fresh-core-v2-authoritative-54';");
sw=sw.replace(/ly-module-loader\.js\?v=[^'\"]+/g,'ly-module-loader.js?v=20260824.6');
sw=sw.replace(/ly-app-version\.js\?v=[^'\"]+/g,'ly-app-version.js?v=2.1.1');
if(sw!==originalSw)await fs.writeFile(SW,sw,'utf8');
console.log('Patched index.html + sw.js source for Ver 2.1.1');
