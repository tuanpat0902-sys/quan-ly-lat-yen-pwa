import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../ly-activity-history.js',import.meta.url),'utf8');
const cloudRows=[
  {id:9,entity_table:'ly_stocktake_receipts',entity_id:'r1',event_type:'insert',entity_name:'KK-20260824-002',amount:25000,created_at:'2026-08-24T16:30:00Z'},
  {id:8,entity_table:'ly_sales',entity_id:'s1',event_type:'insert',entity_name:'BH-20260824-050',amount:84000,created_at:'2026-08-24T16:00:00Z'}
];
let requestedUrl='';
const window={__lyFreshOrgId:'336164cd-0588-47f6-a538-e731e91a00f2'};
const context={window,E:{history:null},loadAuditLog:()=>[],money:n=>`${n} đ`,setTimeout,clearTimeout,AbortController,activePanelId:'ingredients',fetch:async url=>{requestedUrl=String(url);return {ok:true,json:async()=>({rows:cloudRows})};}};
vm.runInNewContext(source,context);
const ok=await window.__lyActivityHistoryModule.refresh();
const status=window.__lyActivityHistoryModule.status();
if(!ok||status.count!==2||!status.loaded)throw new Error('Cloud activity rows were not loaded');
if(!status.rows.some(x=>x.module==='Kiểm kê'&&x.summary==='KK-20260824-002'))throw new Error('Stocktake event mapping failed');
if(!requestedUrl.includes('/api/v1/activity-events?')||!requestedUrl.includes('limit=50'))throw new Error('Activity history must load at most 50 rows from the paginated Vibe API');
if(source.includes("from('ly_activity_events')")||source.includes('window.sb'))throw new Error('Activity history must not depend on the retired Supabase client');
if(!source.includes('Toàn bộ biến động kho')||source.includes('<details open>'))throw new Error('All inventory movements must share one always-visible table');
if(!source.includes('changeInventoryMovementPage'))throw new Error('Inventory movements must paginate instead of truncating history');
if(source.includes('.slice(0,300)')||!source.includes('allLegacyMovements.slice(movementStart,movementStart+PAGE_SIZE)'))throw new Error('Inventory history must retain all rows and render only the current 50-row page');
if(!source.includes('page>=pageCountForHistory()-1&&cloudState.hasMore'))throw new Error('The next activity page must fetch older Vibe rows before advancing');
console.log('Activity history Cloud loading: PASS');
