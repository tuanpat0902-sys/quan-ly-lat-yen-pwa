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
if(!requestedUrl.includes('/api/v1/activity-events?')||!requestedUrl.includes('limit=100'))throw new Error('Activity history must load from the paginated Vibe API');
if(source.includes("from('ly_activity_events')")||source.includes('window.sb'))throw new Error('Activity history must not depend on the retired Supabase client');
if(!source.includes('<details open>'))throw new Error('Legacy inventory movements must be visible by default');
console.log('Activity history Cloud loading: PASS');
