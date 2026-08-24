(()=>{
'use strict';
if(window.__lyInventoryAlertsV1)return;window.__lyInventoryAlertsV1=true;
const VERSION='2026.08.24.1',STORAGE_KEY='lat_yen_inventory_alert_levels_v1',MASTER_KEY='lat_yen_notifications_master_v1',POLL_MS=60000;
const state={scans:0,alerts:0,lastAt:0,lastError:'',timer:null,running:false};
const text=value=>String(value??'').trim();
const number=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;};
const enabled=()=>{try{return localStorage.getItem(MASTER_KEY)!=='0';}catch{return true;}};
function snapshot(){const core=window.__lyFreshCoreV2?.store?.getState?.()||{},legacy=window.db||{};return {ingredients:core.ingredients||legacy.ingredients||[],balances:core.inventoryData?.balances||legacy.inventory||[],warehouses:core.warehouses||legacy.warehouses||[]};}
function classify(quantity,minimum){const qty=number(quantity),min=Math.max(0,number(minimum));if(qty<=0)return 'out';if(min<=0)return '';if(qty<=min)return 'restock';if(qty<=min*1.5)return 'low';return '';}
function readLevels(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return value&&typeof value==='object'?value:{};}catch{return {};}}
function writeLevels(value){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch{}}
const meta=level=>({out:{title:'Hết hàng nguyên liệu',icon:'⛔'},restock:{title:'Nguyên liệu cần nhập',icon:'🛒'},low:{title:'Nguyên liệu sắp hết',icon:'⚠️'}})[level];
function bodyFor(level,rows,warehouseName){const names=rows.slice(0,5).map(row=>`${row.name} (${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(row.quantity)})`),more=rows.length>5?` và ${rows.length-5} nguyên liệu khác`:'';return `${warehouseName}: ${names.join(', ')}${more}.`;}
async function showAlert(level,rows,warehouseId,warehouseName){
  if(!rows.length||!enabled())return false;
  const info=meta(level),body=bodyFor(level,rows,warehouseName);
  if(!document.hidden)window.__lyInAppNotifications?.show?.(body,info.title,level!=='low',info.icon);
  if(document.hidden&&'Notification'in window&&Notification.permission==='granted'){
    try{const registration=await navigator.serviceWorker?.ready;if(registration?.showNotification)await registration.showNotification(info.title,{body,tag:`lat-yen-stock-${warehouseId}-${level}`,renotify:true,requireInteraction:level!=='low',icon:'./icon.svg',badge:'./icon.svg',data:{url:'./',source:'inventory-alert',panel:'imports',level}});}catch(error){state.lastError=text(error?.message||error);}
  }
  state.alerts++;return true;
}
async function scan(){
  if(state.running)return false;state.running=true;
  try{
    const data=snapshot(),warehouseId=text(window.currentWarehouseId);if(!warehouseId)return false;
    const warehouseName=text(data.warehouses.find(row=>String(row.id)===warehouseId)?.name)||'Kho đang chọn',levels=readLevels(),seen=new Set(),changed={low:[],restock:[],out:[]};
    for(const balance of data.balances){
      if(String(balance?.warehouse_id)!==warehouseId)continue;
      const ingredient=data.ingredients.find(row=>String(row.id)===String(balance?.ingredient_id));if(!ingredient)continue;
      const key=`${warehouseId}:${ingredient.id}`,level=classify(balance.quantity,ingredient.minimum_stock??ingredient.min_stock),previous=text(levels[key]);seen.add(key);
      if(level){levels[key]=level;if(level!==previous)changed[level].push({id:ingredient.id,name:text(ingredient.name)||'Nguyên liệu',quantity:number(balance.quantity)});}else delete levels[key];
    }
    for(const key of Object.keys(levels))if(key.startsWith(`${warehouseId}:`)&&!seen.has(key))delete levels[key];
    writeLevels(levels);state.scans++;state.lastAt=Date.now();state.lastError='';
    for(const level of ['out','restock','low'])await showAlert(level,changed[level],warehouseId,warehouseName);
    return changed;
  }catch(error){state.lastError=text(error?.message||error);return false;}finally{state.running=false;}
}
function schedule(delay=1200){clearTimeout(state.timer);state.timer=setTimeout(async()=>{await scan();state.timer=setTimeout(()=>schedule(0),POLL_MS);},delay);}
function boot(){schedule();for(const event of ['latyen:v2-hydrated','latyen:projection-updated','latyen:v2-document-mutated','latyen:v2-sale-mutated','focus'])window.addEventListener?.(event,()=>schedule(250));}
window.__lyInventoryAlerts={version:VERSION,classify,scan,status:()=>({...state,enabled:enabled()})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
