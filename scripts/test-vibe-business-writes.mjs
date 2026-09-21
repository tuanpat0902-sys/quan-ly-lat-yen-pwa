import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../ly-vibe-business-writes.js',import.meta.url),'utf8');
const cashflowView=readFileSync(new URL('../ly-cashflow.js',import.meta.url),'utf8');
const businessApi=readFileSync(new URL('./vibehost-business-mutation-api.mjs',import.meta.url),'utf8');
assert.doesNotMatch(cashflowView,/function renderCashflow\(\)\s*\{[\s\S]*?const modeValue[\s\S]*?refreshCashflow\(/,'opening Thu/Chi must not replace the shared Finance snapshot with a second read');
assert.match(businessApi,/documentMatch&&request\.method==='DELETE'[\s\S]*client\.query\('begin'\)[\s\S]*deleteDocument\([\s\S]*client\.query\('commit'\)/,'receipt deletion must be authenticated and committed atomically');
assert.match(businessApi,/async function deleteDocument[\s\S]*existingDocumentEffect[\s\S]*insert into[\s\S]*delete from[\s\S]*recalculateImportCosts/,'receipt deletion must reverse inventory and import costs');
assert.match(businessApi,/if\(requestedId&&!previousHeader\)throw/,'editing a missing receipt must not silently create a second receipt');
assert.match(businessApi,/unnest\(\$3::uuid\[\],\$4::numeric\[\]\)/,'receipt deletion must update all affected inventory rows in one database query');
assert.match(businessApi,/with target as\(select unnest\(\$2::uuid\[\]\)/,'import costs must be recalculated in one database query');
assert.match(businessApi,/stocktakeValues=kind==='stocktake'\?\{shortage_value:0,surplus_value:0\}/,'stocktake headers must include required shortage and surplus values');
assert.match(businessApi,/stocktakeValues\.shortage_value\+=Math\.max\(-diff\*cost,0\);stocktakeValues\.surplus_value\+=Math\.max\(diff\*cost,0\)/,'stocktake must total shortages and surpluses from item differences');
assert.match(businessApi,/ledgerType=\{import:'IMPORT',export:'EXPORT',stocktake:'ADJUSTMENT'\}/,'warehouse documents must write a canonical stock ledger');
assert.match(businessApi,/insert\(client,'ly_stock_transactions',[\s\S]*source_id:id/,'warehouse document ledger rows must be linked to their source receipt');
assert.match(businessApi,/recordActivity[\s\S]*ly_activity_events/,'confirmed Vibe writes must create an activity event in the same transaction');
assert.match(businessApi,/actor_email[\s\S]*user\.email/,'activity events must retain the authenticated actor');
assert.match(businessApi,/for update[\s\S]*expected_updated_at[\s\S]*ConflictError/,'edits must lock and reject stale versions from another device');
assert.match(businessApi,/json\(response,409,\{error:error\.message,code:'STALE_WRITE'\}\)/,'stale writes must return an explicit conflict response');
assert.match(source,/withExpectedVersion\(path,payload\)/,'browser writes must carry the version originally loaded by the user');
assert.match(businessApi,/saleMatch&&request\.method==='DELETE'[\s\S]*recordActivity\(client,user,\{table:'ly_sales'[\s\S]*type:'DELETE'/,'sale deletion must create an authoritative activity event');
assert.match(businessApi,/update .*ly_stocktake_receipts.*returning \*/,'stocktake must persist final shortage and surplus values');
assert.match(businessApi,/pathname==='\/api\/v1\/business\/cashflow'&&request\.method==='GET'/,'cashflow history must be read from the authoritative Vibe database');
assert.match(businessApi,/cashflowMatch&&request\.method==='DELETE'[\s\S]*delete from .*ly_cashflow_entries where id=\$1::uuid and org_id=\$2::uuid and warehouse_id=\$3::uuid returning id/,'cashflow deletion must be scoped to the authenticated organization and selected warehouse');
assert.match(businessApi,/async function deleteSale[\s\S]*for update[\s\S]*adjustInventory[\s\S]*delete from .*ly_sales/,'sale deletion must lock the receipt and restore inventory in one transaction');
assert.match(businessApi,/documentMatch=.*stocktake[\s\S]*documentMatch&&request\.method==='DELETE'/,'stocktake deletion must use the same transactional Vibe route as warehouse receipts');
assert.match(source,/window\.deleteSaleReceipt=async function[\s\S]*\/api\/v1\/business\/sale\//,'sale deletion must never fall through to the retired Supabase RPC on Vibe');
assert.match(source,/window\.deleteIngredient=async function[\s\S]*\/api\/v1\/business\/ingredient\//,'ingredient deletion must use the Vibe API');
assert.match(source,/window\.deleteRecipe=async function[\s\S]*\/api\/v1\/business\/product\//,'recipe deletion must use the Vibe API');
async function setup({stale=false,failed=false,badResponse=false,resolved=false,wrongIngredient=false,wrongProduct=false,deleteFailed=false,deleteCancelled=false,cashflowMissing=false,cashflowDeleteFailed=false,employeeSaveFailed=false,wrongReceiptDate=false,receiptType='IMPORT'}={}){
  const calls=[],alerts=[],toasts=[],deleted=[],legacyReceiptDeletes=[],legacyCashflowDeletes=[];
  let employees=[{id:'old',code:'A'},{id:'new',code:'A',updated_at:'2026'}],refreshes=0;
  const fields={rpName:{value:'Tea'},rpPrice:{value:'15000'},rpSku:{value:'T'},rpUnit:{value:'ly'},rpSaveBtn:{},empCode:{value:'B'},empName:{value:'Bình'},empActive:{value:'1'},receiptNo:{value:'PN-TEST'},receiptDate:{value:'2026-09-19'},receiptNote:{value:'đã sửa'},inlineImportReceiptForm:{dataset:{editKey:'ref:11111111-1111-4111-8111-111111111111'}},saveReceiptBtn:{},receiptResult:{},exportReceiptNo:{value:'PX-TEST'},exportReceiptDate:{value:'2026-09-19'},exportReceiptReason:{value:'đã sửa'},exportFinanceTreatment:{value:'inventory'},inlineExportReceiptForm:{dataset:{editReferenceId:'11111111-1111-4111-8111-111111111111'}},saveExportReceiptBtn:{},exportReceiptResult:{},stocktakeReceiptNo:{value:'KK-TEST'},stocktakeReceiptDate:{value:'2026-09-19'},stocktakeReceiptNote:{value:'đã sửa'},inlineStocktakeForm:{dataset:{editKey:''}},saveStocktakeReceiptBtn:{},stocktakeReceiptResult:{},cashflowType:{value:'expense'},cashflowDate:{value:'2026-09-19'},cashflowCategory:{value:'Điện'},cashflowAmount:{value:'100000'},cashflowNote:{value:'test'}};
  const line={querySelector:selector=>selector==='.rlIng'?{value:'i',selectedOptions:[{textContent:'Leaf'}]}:{value:'2'}};
  const noop=()=>{};
  const receipt={reference_id:'11111111-1111-4111-8111-111111111111',receipt_no:'PN-TEST',transaction_type:receiptType};
  const ctx={location:{hostname:'test.tinhgon.xyz'},currentWarehouseId:'w',document:{readyState:'complete',querySelectorAll:()=>[line],querySelector:()=>null},$:id=>fields[id],db:{products:[],recipeItems:[],movements:[receipt],inventory:[{warehouse_id:'w',ingredient_id:'ingredient',quantity:10}],ingredients:[{id:'ingredient',cost:5}]},CustomEvent:class{},dispatchEvent:noop,console,setTimeout,alert:message=>alerts.push(message),confirm:()=>!deleteCancelled,toastMsg:message=>toasts.push(message),uid:()=> 'employee-new',nextEmployeeCode:()=> 'B',todayLocalISO:()=> '2026-09-19',closeModal:noop,saveIngredient:noop,saveRecipe:noop,saveImportReceipt:noop,saveExportReceipt:noop,saveStocktakeReceipt:noop,getImportReceiptLines:()=>[{ingredient_id:'ingredient',quantity:2,unit_cost:5}],getExportReceiptLines:()=>[{ingredient_id:'ingredient',quantity:1,unit_cost:7}],getStocktakeReceiptLines:()=>[{ingredient_id:'ingredient',actual:8,line_order:1}],toggleImportReceiptForm:noop,toggleExportReceiptForm:noop,toggleStocktakeForm:noop,deleteImportReceipt:()=>legacyReceiptDeletes.push('import'),deleteExportReceipt:()=>legacyReceiptDeletes.push('export'),deleteCashflowEntry:()=>legacyCashflowDeletes.push('cashflow'),receiptRowsByKey:()=>[receipt],exportReceiptRows:()=>[receipt],lyFreshRef:value=>String(value||'').replace(/^ref:/,''),receiptNumberFromMovement:()=>receipt.receipt_no,exportReceiptNumberFromMovement:()=>receipt.receipt_no,appConfirm:async()=>!deleteCancelled,deleteEmployee:(id)=>{deleted.push('local');employees=employees.filter(row=>String(row.id)!==String(id));},loadEmployees:()=>employees,saveEmployees:rows=>{employees=rows;},saveEmployee:()=>{employees.push({id:'explicit',code:'B'});},markEmployeeDeleted:id=>deleted.push(id),renderEmployees:noop,renderCashflow:noop,renderFinanceData:noop,invalidateDerivedCaches:noop,saveProductUnit:noop,assignProductToWarehouse:noop,toggleRecipeForm:noop,renderRecipes:noop,renderSales:noop,renderDashboard:noop};
  let posted,savedCashflow;
  ctx.fetch=async(path,options={})=>{calls.push({path,options});if(options.method==='DELETE'){if(path.startsWith('/api/v1/business/cashflow/'))return {ok:!cashflowDeleteFailed,json:async()=>cashflowDeleteFailed?{error:'Vibe không thể xóa'}:{ok:true,id:path.split('/').at(-1).split('?')[0]}};return {ok:!deleteFailed,json:async()=>deleteFailed?{error:'Vibe không thể xóa'}:{ok:true,id:receipt.reference_id,receipt_no:receipt.receipt_no,inventory:[{warehouse_id:'w',ingredient_id:'ingredient',quantity:8}],costs:[{id:'ingredient',cost:4}]}};}if(options.method==='POST'){const body=JSON.parse(options.body);if(body.employee&&employeeSaveFailed)return {ok:false,json:async()=>({error:'Cloud unavailable'})};if(body.product){posted=body;return {ok:true,json:async()=>({id:'p',row:{...body.product,id:'p'},recipe_items:body.recipe_items.map(row=>({...row,ingredient_id:resolved?'resolved-id':row.ingredient_id,quantity:badResponse?9:row.quantity}))})};}if(body.cashflow){savedCashflow={...body.cashflow,id:'saved'};return {ok:true,json:async()=>({id:'saved',row:savedCashflow})};}if(body.header)return {ok:true,json:async()=>({id:'saved',header:{receipt_date:wrongReceiptDate?'2026-09-20T00:00:00.000Z':`${body.header.receipt_date}T00:00:00.000Z`}})};return {ok:true,json:async()=>({id:'saved'})};}return {ok:true,json:async()=>({rows:path.startsWith('/api/v1/business/cashflow?')&&savedCashflow&&!cashflowMissing?[savedCashflow]:[]})};};
  ctx.loadCloud=async()=>{refreshes++;if(refreshes===1)return {ok:false,deferred:true};if(failed)return {ok:false};if(!posted)return {ok:true};ctx.db.products=[{...posted.product,id:'p',name:wrongProduct?'Old tea':posted.product.name}];ctx.db.recipeItems=posted.recipe_items.map(row=>({...row,product_id:'p',ingredient_id:wrongIngredient?'wrong-id':resolved?'resolved-id':row.ingredient_id,quantity:stale?7:row.quantity}));return {ok:true};};
  ctx.window=ctx;vm.runInNewContext(source,ctx);await new Promise(resolve=>setImmediate(resolve));
  return {ctx,calls,alerts,toasts,deleted,legacyReceiptDeletes,legacyCashflowDeletes,refreshes:()=>refreshes,employees:()=>employees};
}
const boot=await setup();
assert.equal(boot.calls.length,1);assert.equal(boot.calls[0].options.method,undefined);assert.equal(boot.employees().length,0);
boot.ctx.saveEmployees([{id:'a',code:'same'},{id:'b',code:'same',updated_at:'2026'}]);
assert.equal(boot.ctx.loadEmployees().length,1);assert.equal(boot.deleted.length,0);
await boot.ctx.saveEmployee();assert.equal(boot.calls.filter(call=>call.options.method==='POST').length,1,'Explicit employee save still writes');
assert.ok(boot.employees().some(row=>row.name==='Bình'),'employee must appear locally only after Vibe confirms the save');
const failedEmployee=await setup({employeeSaveFailed:true});
await failedEmployee.ctx.saveEmployee();
assert.equal(failedEmployee.employees().length,0,'failed Vibe employee save must not create a misleading local success');
assert.match(failedEmployee.alerts.at(-1),/Lỗi lưu nhân viên/);
const employeeId='33333333-3333-4333-8333-333333333333';
const deletedEmployee=await setup();deletedEmployee.ctx.saveEmployees([{id:'local-employee',vibe_id:employeeId,code:'C',name:'Chi'}]);
assert.equal(await deletedEmployee.ctx.deleteEmployee('local-employee'),true);
assert.equal(deletedEmployee.employees().length,0,'employee must leave the device only after Vibe confirms deletion');
assert.equal(deletedEmployee.deleted[0],'local');
const failedEmployeeDelete=await setup({deleteFailed:true});failedEmployeeDelete.ctx.saveEmployees([{id:'local-employee',vibe_id:employeeId,code:'C',name:'Chi'}]);
assert.equal(await failedEmployeeDelete.ctx.deleteEmployee('local-employee'),false);
assert.equal(failedEmployeeDelete.employees().length,1,'a failed Vibe deletion must keep the employee on the device');
const good=await setup();await Promise.all([good.ctx.saveRecipe(),good.ctx.saveRecipe()]);
assert.equal(good.calls.filter(call=>call.path.endsWith('/product')).length,1,'Double save must issue only one write');assert.equal(good.refreshes(),2);assert.equal(good.alerts.length,0);assert.equal(good.toasts.length,1);
for(const options of [{stale:true},{failed:true},{wrongIngredient:true},{wrongProduct:true}]){const test=await setup(options);await test.ctx.saveRecipe();assert.equal(test.alerts.length,0,'a confirmed write must not be reported as failed when its refresh is stale');assert.match(test.toasts.at(-1),/đang chờ đồng bộ/);}
const badRecipe=await setup({badResponse:true});await badRecipe.ctx.saveRecipe();assert.equal(badRecipe.toasts.length,0);assert.equal(badRecipe.alerts.length,1);
const resolved=await setup({resolved:true});await resolved.ctx.saveRecipe();assert.equal(resolved.alerts.length,0);assert.equal(resolved.toasts.length,1);
for(const kind of ['import','export']){const test=await setup();await test.ctx[kind==='import'?'saveImportReceipt':'saveExportReceipt']();const write=test.calls.find(call=>call.path===`/api/v1/business/${kind}`);assert.ok(write,`${kind} edit must use Vibe API`);assert.equal(JSON.parse(write.options.body).header.id,'11111111-1111-4111-8111-111111111111',`${kind} edit must target the existing receipt`);assert.equal(test.alerts.length,0);}
const backdatedImport=await setup();backdatedImport.ctx.$('receiptDate').value='2026-09-13';await backdatedImport.ctx.saveImportReceipt();
assert.equal(JSON.parse(backdatedImport.calls.find(call=>call.path==='/api/v1/business/import').options.body).header.receipt_date,'2026-09-13','Vibe import must send the user-selected past date');
assert.match(backdatedImport.toasts.at(-1),/2026-09-13/);
const dateMismatch=await setup({wrongReceiptDate:true});dateMismatch.ctx.$('receiptDate').value='2026-09-13';await dateMismatch.ctx.saveImportReceipt();
assert.match(dateMismatch.alerts.at(-1),/khác ngày đã chọn/,'a server-confirmed wrong date must not be reported as success');
assert.equal(dateMismatch.ctx.$('inlineImportReceiptForm').dataset.editKey,'ref:saved','a wrong-date receipt must remain editable without creating a duplicate');
const stocktake=await setup();await stocktake.ctx.saveStocktakeReceipt();const stocktakeWrite=stocktake.calls.find(call=>call.path==='/api/v1/business/stocktake');assert.ok(stocktakeWrite,'stocktake must use Vibe API');assert.deepEqual(JSON.parse(stocktakeWrite.options.body).items,[{ingredient_id:'ingredient',actual_qty:8,line_order:1}]);assert.equal(stocktake.alerts.length,0);
const cashflow=await setup();await cashflow.ctx.addCashflowEntry();assert.equal(cashflow.ctx.__lyFreshCashflow?.[0]?.amount,100000,'saved cashflow must appear in the local report projection');assert.equal(cashflow.ctx.__lyFreshCashflow?.[0]?.date,'2026-09-19');assert.ok(cashflow.calls.some(call=>call.path.startsWith('/api/v1/business/cashflow?')),'history must be re-read from Vibe after save');assert.match(cashflow.toasts.at(-1),/Đã lưu và hiển thị/);
const financeHasEntries=await setup();financeHasEntries.ctx.__lyFreshCashflow=[{id:'expense-200',warehouse_id:'w',type:'expense',date:'2026-09-19',category:'Điện',amount:200},{id:'expense-100',warehouse_id:'w',type:'expense',date:'2026-09-19',category:'Điện',amount:100}];assert.equal(await financeHasEntries.ctx.__lyVibeBusinessWrites.refreshCashflow(true),false,'empty secondary read must not clear entries already visible in Finance');assert.equal(financeHasEntries.ctx.__lyFreshCashflow.length,2);assert.equal(financeHasEntries.ctx.__lyFreshCashflow.reduce((sum,row)=>sum+row.amount,0),300);
const unconfirmedCashflow=await setup({cashflowMissing:true});await unconfirmedCashflow.ctx.addCashflowEntry();assert.doesNotMatch(unconfirmedCashflow.toasts.at(-1),/Đã lưu và hiển thị/,'missing history must not be claimed as confirmed');
const cashflowDeleteId='22222222-2222-4222-8222-222222222222';
const deleteCashflow=await setup();deleteCashflow.ctx.__lyFreshCashflow=[{id:cashflowDeleteId,warehouse_id:'w',type:'expense',date:'2026-09-19',amount:200}];assert.equal(await deleteCashflow.ctx.deleteCashflowEntry(cashflowDeleteId),true);assert.equal(deleteCashflow.ctx.__lyFreshCashflow.length,0,'confirmed Vibe deletion must remove the row from the local report');assert.equal(deleteCashflow.legacyCashflowDeletes.length,0,'Vibe deletion must never call the legacy Supabase path');assert.match(deleteCashflow.calls.find(call=>call.options.method==='DELETE').path,/warehouse_id=w/);
const failedCashflowDelete=await setup({cashflowDeleteFailed:true});failedCashflowDelete.ctx.__lyFreshCashflow=[{id:cashflowDeleteId,warehouse_id:'w',amount:200}];assert.equal(await failedCashflowDelete.ctx.deleteCashflowEntry(cashflowDeleteId),false);assert.equal(failedCashflowDelete.ctx.__lyFreshCashflow.length,1,'failed deletion must leave the visible row intact');assert.match(failedCashflowDelete.alerts.at(-1),/Lỗi xóa Thu\/Chi/);
const cancelledCashflowDelete=await setup({deleteCancelled:true});cancelledCashflowDelete.ctx.__lyFreshCashflow=[{id:cashflowDeleteId,warehouse_id:'w'}];assert.equal(await cancelledCashflowDelete.ctx.deleteCashflowEntry(cashflowDeleteId),false);assert.equal(cancelledCashflowDelete.calls.filter(call=>call.options.method==='DELETE').length,0);
const savedButNotReloaded=await setup({failed:true});assert.equal(await savedButNotReloaded.ctx.saveImportReceipt(),'saved');assert.equal(savedButNotReloaded.alerts.length,0,'confirmed writes must not be reported as failed solely because refresh failed');
for(const [kind,method,formId,key] of [
  ['import','saveImportReceipt','inlineImportReceiptForm','editKey'],
  ['export','saveExportReceipt','inlineExportReceiptForm','editReferenceId'],
  ['stocktake','saveStocktakeReceipt','inlineStocktakeForm','editKey']
]){
  const retry=await setup({failed:true});
  retry.ctx.$(formId).dataset[key]='';
  assert.equal(await retry.ctx[method](),'saved');
  assert.equal(await retry.ctx[method](),'saved');
  const writes=retry.calls.filter(call=>call.path===`/api/v1/business/${kind}`);
  assert.ok(!JSON.parse(writes[0].options.body).header.id);
  assert.equal(JSON.parse(writes[1].options.body).header.id,'saved',`${kind} retry must update the confirmed receipt instead of duplicating it`);
}
for(const kind of ['import','export']){const test=await setup({receiptType:kind.toUpperCase()});const result=await test.ctx[kind==='import'?'deleteImportReceipt':'deleteExportReceipt']('ref:11111111-1111-4111-8111-111111111111');assert.equal(result,true);assert.equal(test.calls.filter(call=>call.options.method==='DELETE').length,1);assert.match(test.calls.at(-1).path,new RegExp(`/api/v1/business/${kind}/`));assert.equal(test.legacyReceiptDeletes.length,0);assert.equal(test.ctx.db.movements.length,0,'local receipt should disappear immediately after Vibe confirms deletion');assert.equal(test.ctx.db.inventory[0].quantity,8);}
const failedDelete=await setup({deleteFailed:true});assert.equal(await failedDelete.ctx.deleteImportReceipt('ref:11111111-1111-4111-8111-111111111111'),false);assert.equal(failedDelete.ctx.db.movements.length,1);assert.equal(failedDelete.alerts.length,1);
const cancelledDelete=await setup({deleteCancelled:true});assert.equal(await cancelledDelete.ctx.deleteExportReceipt('ref:11111111-1111-4111-8111-111111111111'),false);assert.equal(cancelledDelete.calls.filter(call=>call.options.method==='DELETE').length,0);
console.log('Vibe business writes: read-only employee boot, pure dedupe, explicit employee writes, deferred refresh, recipe field verification and duplicate-save guard passed.');
