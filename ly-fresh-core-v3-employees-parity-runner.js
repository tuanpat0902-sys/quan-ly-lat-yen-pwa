(()=>{
  'use strict';
  if(window.__lyFreshCoreV3EmployeesParityRunner)return;
  const VERSION='2026.08.28.1';
  const STORAGE_KEY='lat_yen_v3_employees_directory_parity_v1';
  let running=false,lastResult=null;

  const text=value=>String(value??'').trim();
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function identity(){
    const core=window.__lyFreshCoreV3;
    const v2=window.__lyFreshCoreV2;
    const orgId=text(v2?.store?.getState?.()?.orgId||core?.store?.getState?.()?.orgId||window.__lyFreshOrgId);
    let warehouseId='';
    try{warehouseId=text(window.warehouse?.()?.id);}catch(_){warehouseId='';}
    return {core,orgId,warehouseId};
  }

  function deviceContext(){
    const ctx=identity();
    let legacyRows=null;
    try{const rows=window.loadEmployees?.();legacyRows=Array.isArray(rows)?rows:null;}catch(_){legacyRows=null;}
    return {...ctx,legacyRows};
  }

  function readLocal(){
    const {orgId,warehouseId}=identity();
    if(!orgId||!warehouseId)return null;
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};
      return saved?.orgs?.[orgId]?.warehouses?.[warehouseId]||null;
    }catch(_){return null;}
  }

  async function run(){
    if(running)return lastResult;
    const ctx=deviceContext();
    if(!ctx.core?.gateway)throw new Error('Fresh Core V3 gateway chưa sẵn sàng');
    if(!ctx.orgId)throw new Error('Chưa xác định organization hiện tại');
    if(!ctx.warehouseId)throw new Error('Chưa xác định kho/chi nhánh hiện tại');
    if(!Array.isArray(ctx.legacyRows))throw new Error('Chưa đọc được danh sách nhân viên legacy trên thiết bị');
    running=true;render();
    try{
      const [{createEmployeesDirectorySource},{runEmployeesManualDeviceParity}]=await Promise.all([
        import('./src-v3/data/supabase/employees-directory-source.js?v=20260828.1'),
        import('./src-v3/domains/employees/manual-device-parity.js?v=20260828.1')
      ]);
      const source=createEmployeesDirectorySource({gateway:ctx.core.gateway});
      lastResult=await runEmployeesManualDeviceParity({
        source,legacyRows:ctx.legacyRows,orgId:ctx.orgId,warehouseId:ctx.warehouseId,
        storage:localStorage,events:ctx.core.events
      });
      try{window.dispatchEvent(new CustomEvent('latyen:v3-employees-device-parity',{detail:{gate:lastResult.gate,counts:lastResult.counts,reads:lastResult.reads,writes:lastResult.writes}}));}catch(_){ }
      return lastResult;
    }finally{running=false;render();}
  }

  function status(){
    const entry=readLocal();
    return Object.freeze({
      version:VERSION,running,available:!!window.__lyFreshCoreV3?.gateway,
      lastAt:Number(entry?.lastAt||0),gate:entry?.gate||null,observation:entry?.observation||null,
      authoritative:false,activationAllowed:false,autoPromotion:false,cloudWrites:0
    });
  }

  function render(){
    const settings=document.getElementById('settings');
    if(!settings)return false;
    let box=document.getElementById('lyV36EmployeesParityBox');
    if(!box){
      box=document.createElement('div');
      box.id='lyV36EmployeesParityBox';
      box.className='card ly-v3-card';
      const anchor=document.getElementById('lyV3ShadowStatusCard');
      if(anchor?.parentElement===settings)anchor.insertAdjacentElement('afterend',box);else settings.appendChild(box);
    }
    const s=status(),gate=s.gate||{},obs=s.observation||{};
    const state=gate.pass===true?'PASS · đủ điều kiện review controlled shadow':gate.cloudSeedRequired===true?'LOCKED · cần controlled cloud directory seed':s.lastAt?'LOCKED · '+text(gate.recommendation||'parity chưa đạt'):'Chưa có observation thiết bị thật';
    const cls=gate.pass===true?'ly-v3-ok':gate.cloudSeedRequired===true?'ly-v3-bad':'ly-v3-warn';
    const when=s.lastAt?new Date(s.lastAt).toLocaleString('vi-VN'):'Chưa chạy';
    const counts=s.lastAt?`${Number(obs.legacyCount||0)} legacy · ${Number(obs.cloudCount||0)} cloud`:'—';
    box.innerHTML=`<h3 style="margin:0">V3-6 Employees parity</h3><div class="ly-v3-grid"><div class="ly-v3-metric"><b>Trạng thái</b><span class="${cls}">${esc(state)}</span></div><div class="ly-v3-metric"><b>Observation thiết bị</b><span>${esc(when)} · ${esc(counts)}</span></div></div><div style="margin-top:8px"><button id="lyV36EmployeesParityBtn" type="button" ${running?'disabled':''}>${running?'Đang kiểm tra…':'Kiểm tra parity V3-6 trên thiết bị'}</button></div><div class="ly-v3-note">Chỉ chạy khi bấm nút: đúng 1 safe-RPC read, 0 write. Evidence chỉ lưu localStorage và không chứa hồ sơ, PII hay lương. PASS chỉ mở review; không tự seed, không tự activate và không đổi authority.</div>`;
    const btn=box.querySelector('#lyV36EmployeesParityBtn');
    btn?.addEventListener('click',async()=>{
      try{await run();}
      catch(error){lastResult=null;console.warn('[Lát Yên] V3-6 device parity',error);alert(`Không thể chạy V3-6 parity: ${text(error?.message||error)}`);render();}
    },{once:true});
    return true;
  }

  function start(){
    render();
    window.addEventListener('latyen:panel',event=>{if(event?.detail?.panel==='settings')setTimeout(render,0);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.__lyFreshCoreV3EmployeesParityRunner=Object.freeze({version:VERSION,run,status,render,policy:Object.freeze({manualOnly:true,cloudReadsPerRun:1,cloudWritesPerRun:0,storage:'localStorage-only',authoritative:false,activationAllowed:false,autoPromotion:false})});
})();
