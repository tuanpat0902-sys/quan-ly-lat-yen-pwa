import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../ly-vibe-business-writes.js',import.meta.url),'utf8');
async function setup({stale=false,failed=false,badResponse=false,resolved=false,wrongIngredient=false,wrongProduct=false}={}){
  const calls=[],alerts=[],toasts=[],deleted=[];
  let employees=[{id:'old',code:'A'},{id:'new',code:'A',updated_at:'2026'}],refreshes=0;
  const fields={rpName:{value:'Tea'},rpPrice:{value:'15000'},rpSku:{value:'T'},rpUnit:{value:'ly'},rpSaveBtn:{},empCode:{value:'B'}};
  const line={querySelector:selector=>selector==='.rlIng'?{value:'i',selectedOptions:[{textContent:'Leaf'}]}:{value:'2'}};
  const noop=()=>{};
  const ctx={location:{hostname:'test.tinhgon.xyz'},currentWarehouseId:'w',document:{readyState:'complete',querySelectorAll:()=>[line]},$:id=>fields[id],db:{products:[],recipeItems:[]},CustomEvent:class{},dispatchEvent:noop,console,setTimeout,alert:message=>alerts.push(message),toastMsg:message=>toasts.push(message),saveIngredient:noop,saveRecipe:noop,deleteEmployee:noop,loadEmployees:()=>employees,saveEmployees:rows=>{employees=rows;},saveEmployee:()=>{employees.push({id:'explicit',code:'B'});},markEmployeeDeleted:id=>deleted.push(id),renderEmployees:noop,saveProductUnit:noop,assignProductToWarehouse:noop,toggleRecipeForm:noop,renderRecipes:noop,renderSales:noop,renderDashboard:noop};
  let posted;
  ctx.fetch=async(path,options)=>{calls.push({path,options});if(options.method==='POST'){const body=JSON.parse(options.body);if(body.product){posted=body;return {ok:true,json:async()=>({id:'p',row:{...body.product,id:'p'},recipe_items:body.recipe_items.map(row=>({...row,ingredient_id:resolved?'resolved-id':row.ingredient_id,quantity:badResponse?9:row.quantity}))})};}return {ok:true,json:async()=>({id:'saved'})};}return {ok:true,json:async()=>({rows:[]})};};
  ctx.loadCloud=async()=>{refreshes++;if(refreshes===1)return {ok:false,deferred:true};if(failed)return {ok:false};ctx.db.products=[{...posted.product,id:'p',name:wrongProduct?'Old tea':posted.product.name}];ctx.db.recipeItems=posted.recipe_items.map(row=>({...row,product_id:'p',ingredient_id:wrongIngredient?'wrong-id':resolved?'resolved-id':row.ingredient_id,quantity:stale?7:row.quantity}));return {ok:true};};
  ctx.window=ctx;vm.runInNewContext(source,ctx);await new Promise(resolve=>setImmediate(resolve));
  return {ctx,calls,alerts,toasts,deleted,refreshes:()=>refreshes,employees:()=>employees};
}
const boot=await setup();
assert.equal(boot.calls.length,1);assert.equal(boot.calls[0].options.method,undefined);assert.equal(boot.employees().length,0);
boot.ctx.saveEmployees([{id:'a',code:'same'},{id:'b',code:'same',updated_at:'2026'}]);
assert.equal(boot.ctx.loadEmployees().length,1);assert.equal(boot.deleted.length,0);
await boot.ctx.saveEmployee();assert.equal(boot.calls.filter(call=>call.options.method==='POST').length,1,'Explicit employee save still writes');
const good=await setup();await Promise.all([good.ctx.saveRecipe(),good.ctx.saveRecipe()]);
assert.equal(good.calls.filter(call=>call.path.endsWith('/product')).length,1,'Double save must issue only one write');assert.equal(good.refreshes(),2);assert.equal(good.alerts.length,0);assert.equal(good.toasts.length,1);
for(const options of [{stale:true},{failed:true},{badResponse:true},{wrongIngredient:true},{wrongProduct:true}]){const test=await setup(options);await test.ctx.saveRecipe();assert.equal(test.toasts.length,0);assert.equal(test.alerts.length,1);}
const resolved=await setup({resolved:true});await resolved.ctx.saveRecipe();assert.equal(resolved.alerts.length,0);assert.equal(resolved.toasts.length,1);
console.log('Vibe business writes: read-only employee boot, pure dedupe, explicit employee writes, deferred refresh, recipe field verification and duplicate-save guard passed.');
