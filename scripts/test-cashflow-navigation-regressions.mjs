import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const cashflowSource=await fs.readFile(new URL('../ly-cashflow.js',import.meta.url),'utf8');

const navStart=source.indexOf("const ACTIVE_PANEL_STORAGE_KEY=");
const navEnd=source.indexOf('const renderQueue=',navStart);
assert.ok(navStart>0&&navEnd>navStart,'active-panel persistence block must exist');

const stored=[];
const navContext={
  Set,String,
  localStorage:{
    getItem:key=>key==='lat_yen_active_panel_v1'?'cashflow':null,
    setItem:(key,value)=>stored.push([key,value])
  }
};
vm.createContext(navContext);
vm.runInContext(
  source.slice(navStart,navEnd)+
    ';globalThis.__activePanelId=activePanelId;'+
    'globalThis.__normalizeActivePanelId=normalizeActivePanelId;',
  navContext,
  {filename:'active-panel-persistence.js'}
);
assert.equal(navContext.__activePanelId,'cashflow','reload must restore the last valid panel');
assert.equal(navContext.__normalizeActivePanelId('unknown'),'ingredients','invalid persisted panels must fall back safely');
assert.match(source,/showTab\(\s*selectedPanel,/,'nav initialization must restore the active panel shell before Cloud render');
assert.match(source,/localStorage\.setItem\(ACTIVE_PANEL_STORAGE_KEY,activePanelId\)/,'navigation must persist every panel change');

const blockStart=source.indexOf('<script id="fresh-cashflow-cloud-core">');
const scriptStart=source.indexOf('\n',blockStart)+1;
const blockEnd=source.indexOf('</script>',scriptStart);
assert.ok(blockStart>0&&blockEnd>scriptStart,'Fresh Cashflow Cloud block must exist');

let entries=[];
let renders=0;
const input={
  cashflowType:{value:'income'},cashflowDate:{value:'2026-08-24'},
  cashflowCategory:{value:'Thu thử nghiệm'},cashflowAmount:{value:'125000'},
  cashflowNote:{value:'Hiển thị ngay'}
};
const submit={disabled:false,textContent:'Lưu phiếu'};
const context={
  window:null,console,Number,String,Array,Promise,
  activePanelId:'cashflow',currentWarehouseId:'warehouse-1',
  cashflowEditId:'',cashflowFormOpen:true,
  INVENTORY_PAYMENT_CASHFLOW_CATEGORY:'Thanh toán Nhập kho (không tính P&L)',
  $:id=>input[id]||null,uid:()=> 'cashflow-new',
  lyFreshRequireOnline:()=>true,
  invalidateDataIndexes:()=>{},invalidateDerivedCaches:()=>{},
  toastMsg:()=>{},alert:message=>{throw new Error(String(message));},confirm:()=>true,
  document:{
    querySelector:selector=>selector==='.cashflow-form-actions .primary'?submit:null,
    getElementById:()=>null
  }
};
context.window=context;
context.__lyFreshCashflow=[];
context.__lyFreshCoreV2={
  store:{getState:()=>({cashflowEntries:entries})},
  domains:{cashflow:{
    async create(row){entries=[{...row,created_at:'2026-08-24T08:00:00Z'}];return entries[0];},
    async update(id,row){entries=entries.map(x=>x.id===id?{...x,...row}:x);return entries[0]||null;},
    async remove(id){const row=entries.find(x=>x.id===id)||null;entries=entries.filter(x=>x.id!==id);return row;}
  }}
};
vm.createContext(context);
const projectionStart=cashflowSource.indexOf('function normalizeCashflowEntry(');
const projectionEnd=cashflowSource.indexOf('window.__lyCashflowModule.renderCashflow=',projectionStart);
assert.ok(projectionStart>0&&projectionEnd>projectionStart,'cashflow module must expose normalized direct Fresh projection');
vm.runInContext(
  cashflowSource.slice(projectionStart,projectionEnd)+
    ';globalThis.__projectFreshState=projectFreshState;',
  context,
  {filename:'cashflow-fresh-projection.js'}
);
context.renderCashflow=()=>{renders++;};
context.__lyCashflowModule={projectFreshState:context.__projectFreshState};
vm.runInContext(source.slice(scriptStart,blockEnd),context,{filename:'fresh-cashflow-cloud-core.js'});

await context.addCashflowEntry();
assert.equal(context.__lyFreshCashflow.length,1,'new cashflow must be projected immediately from Fresh Core');
assert.equal(context.loadCashflow()[0].id,'cashflow-new','new cashflow must be visible without reloading Cloud');
assert.equal(renders,1,'active Cashflow UI must repaint immediately after create');

await context.deleteCashflowEntry('cashflow-new');
assert.equal(context.__lyFreshCashflow.length,0,'deleted cashflow must disappear immediately');
assert.equal(renders,2,'active Cashflow UI must repaint immediately after delete');

console.log('Cashflow and navigation regressions: PASS');
