import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const source=fs.readFileSync('ly-fresh-core-v3-ingredients-inventory-soak.js','utf8');
const cost=JSON.parse(fs.readFileSync('src-v3/cost-policy.json','utf8'));
const contract=fs.readFileSync('src-v3/domains/ingredients-inventory/ingredients-inventory-contract.js','utf8');
const repository=fs.readFileSync('src-v3/domains/ingredients-inventory/ingredients-inventory-repository.js','utf8');
const service=fs.readFileSync('src-v3/domains/ingredients-inventory/ingredients-inventory-service.js','utf8');
const loader=fs.readFileSync('ly-module-loader.js','utf8');
const settings=fs.readFileSync('ly-settings-enhancements.js','utf8');

assert.equal(cost.policy,'zero-added-cost');
assert.equal(cost.shadowSoak.ingredientsInventoryReadOnly,true);
assert.equal(cost.shadowSoak.ingredientsInventoryMaxRunsPerDevicePerDay,1);
assert.equal(cost.shadowSoak.ingredientsInventoryQueriesPerRun,2);
assert.equal(cost.shadowSoak.ingredientsInventoryMaxRowsPerDataset,500);
assert.equal(cost.shadowSoak.ingredientsInventoryCloudWrites,0);

assert.match(source,/MIN_INTERVAL_MS=24\*60\*60\*1000/);
assert.match(source,/VERSION='2026\.08\.28\.4'/,'persistent production scheduler version missing');
assert.match(source,/state\.reads\+=2/);
assert.match(source,/state\.writes=0/);
assert.match(source,/localStorage\.setItem/);
assert.match(source,/maxRowsPerDataset:500/);
assert.match(source,/lastAttemptAt:state\.lastAttemptAt/,'daily query budget must survive failed or interrupted attempts');
assert.match(source,/retryAt=budgetAt\?budgetAt\+MIN_INTERVAL_MS:0/,'next run must be anchored to the persisted 24h deadline');
assert.match(source,/retryTimer=setTimeout\(/,'cooldown expiry must arm a real timer');
for(const event of ['visibilitychange','pageshow','focus','online'])assert.match(source,new RegExp(`['"]${event}['"]`),`${event} resume trigger missing`);
assert.match(source,/if\(!document\.hidden\)arm\('visible'\)/,'hidden tabs must resume without spending reads while hidden');
assert.match(source,/persistentScheduler:true/,'scheduler policy marker missing');
assert.doesNotMatch(source,/setInterval|MutationObserver/,'production scheduler must remain event/deadline driven');
assert.doesNotMatch(source,/\.rpc\s*\(/);
assert.doesNotMatch(source,/\.insert\s*\(/);
assert.doesNotMatch(source,/\.update\s*\(/);
assert.doesNotMatch(source,/\.upsert\s*\(/);
assert.doesNotMatch(source,/\.delete\s*\(/);
assert.doesNotMatch(source,/fetch\s*\(/);

assert.match(contract,/shadowPageSize:500/);
assert.match(repository,/readControlledShadow/);
assert.match(repository,/page:1,pageSize:C\.shadowPageSize/);
assert.match(service,/refreshControlledShadow/);
assert.match(service,/complete=completeIngredients&&completeInventory/);
assert.match(loader,/freshCoreV3IngredientsInventorySoak/);
assert.match(loader,/ly-fresh-core-v3-ingredients-inventory-soak\.js\?v=20260828\.4/,'scheduler asset must bypass stale cache');
assert.match(settings,/V3-2 lịch chạy/,'Settings must expose the next production deadline');
assert.match(settings,/live\.nextRunAt/,'Settings must prefer the live scheduler deadline');
assert.match(loader,/ly-settings-enhancements\.js\?v=20260828\.8/,'Settings scheduler status must bypass stale cache');

const DAY=24*60*60*1000,NOW=10*DAY,ORG='org-scheduler-test';
function schedulerHarness({lastAt=0,lastAttemptAt=0,hidden=false}={}){
  const windowListeners={},documentListeners={},timers=[],idle=[];
  const stored={version:2,orgs:{[ORG]:{lastAt,lastAttemptAt,history:[]}}};
  const localStorage={getItem:key=>key==='lat_yen_v3_ingredients_inventory_shadow_soak_v1'?JSON.stringify(stored):null,setItem(){}};
  const document={hidden,addEventListener:(type,fn)=>documentListeners[type]=fn};
  const window={sb:{auth:{}},__lyFreshCoreV2:{authoritative:true,store:{getState:()=>({orgId:ORG})}},addEventListener:(type,fn)=>windowListeners[type]=fn};
  const context={window,document,navigator:{onLine:true},localStorage,console,CustomEvent:class{},Date:class extends Date{static now(){return NOW;}},setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;},clearTimeout(){},requestIdleCallback:(fn,options)=>{idle.push({fn,options});return idle.length;}};
  vm.runInNewContext(source,context);
  return {window,document,windowListeners,documentListeners,timers,idle};
}

const future=schedulerHarness({lastAt:NOW-60*60*1000});
assert.equal(future.idle.length,0,'cooldown must not spend a cloud-read cycle early');
assert.equal(future.timers.length,1,'cooldown must arm one deadline timer');
assert.equal(future.window.__lyFreshCoreV3IngredientsInventorySoak.status().nextRunAt,NOW+23*60*60*1000);

const hidden=schedulerHarness({lastAt:NOW-60*60*1000,hidden:true});
assert.equal(hidden.timers.length,0,'hidden startup must not arm work or spend reads');
hidden.document.hidden=false;hidden.documentListeners.visibilitychange();
assert.equal(hidden.timers.length,1,'returning to a visible tab must restore the deadline timer');

const due=schedulerHarness({lastAt:NOW-DAY});
assert.equal(due.idle.length,1,'an elapsed 24h deadline must schedule one controlled idle run');

const attempted=schedulerHarness({lastAt:NOW-2*DAY,lastAttemptAt:NOW-30*60*1000});
assert.equal(attempted.idle.length,0,'a recent failed/interrupted attempt must still protect the daily read budget');
assert.equal(attempted.timers.length,1);
assert.equal(attempted.window.__lyFreshCoreV3IngredientsInventorySoak.status().nextRunAt,NOW+23.5*60*60*1000);

console.log('Fresh Core V3-2 controlled production shadow soak: PASS');
