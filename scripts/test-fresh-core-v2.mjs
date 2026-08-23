import assert from 'node:assert/strict';
import { EventBus } from '../src-v2/core/event-bus.js';
import { createStore } from '../src-v2/core/store.js';
import { createSupabaseGateway } from '../src-v2/data/supabase-gateway.js';
import { createFreshCoreV2 } from '../src-v2/bootstrap.js';
import { createIngredientsRepository } from '../src-v2/domains/ingredients/ingredients-repository.js';
import { createProductsRepository } from '../src-v2/domains/products/products-repository.js';
import { createDocumentRepository } from '../src-v2/domains/documents/document-repository.js';
import { createSalesRepository } from '../src-v2/domains/sales/sales-repository.js';

{
  const bus = new EventBus();
  let total = 0;
  const off = bus.on('x', n => { total += n; });
  bus.emit('x', 2); off(); bus.emit('x', 2);
  assert.equal(total, 2);
}

{
  const store = createStore({ count: 0 });
  let seen = 0;
  store.subscribe(state => { seen = state.count; });
  store.patch({ count: 3 });
  assert.equal(store.getState().count, 3);
  assert.equal(seen, 3);
}

{
  const calls = [];
  const fakeQuery = {
    select(columns){ calls.push(['select', columns]); return this; },
    eq(key,value){ calls.push(['eq', key, value]); return Promise.resolve({ data:[{id:1}], error:null }); }
  };
  const client = {
    from(name){ calls.push(['from', name]); return fakeQuery; },
    rpc(name,params){ calls.push(['rpc', name, params]); return Promise.resolve({ data:{ok:true}, error:null }); }
  };
  const gateway = createSupabaseGateway({ client, getOrgId:()=> 'org-1' });
  const rows = await gateway.selectOrg('ly_ingredients');
  assert.equal(rows.length,1);
  assert.deepEqual(calls.slice(0,3),[['from','ly_ingredients'],['select','*'],['eq','org_id','org-1']]);
  assert.deepEqual(await gateway.rpc('ly_bootstrap',{}),{ok:true});
  assert.throws(()=>gateway.table('private_table'),/not allowed/);
  await assert.rejects(()=>gateway.rpc('ly_post_import',{}),/not allowed/);
}

{
  const rpcCalls = [];
  const gateway = {
    selectOrg: async () => [],
    rpc: async (name, params) => { rpcCalls.push([name, params]); return 'id-1'; }
  };
  const ingredients = createIngredientsRepository({ gateway });
  await ingredients.save({ name:'A' }, [{ name:'B' }]);
  assert.deepEqual(rpcCalls.pop(), ['ly_save_ingredient', { p_ingredient:{name:'A'}, p_prepared_items:[{name:'B'}] }]);

  const products = createProductsRepository({ gateway });
  await products.save({ name:'P' }, [{ ingredient_id:'i1' }]);
  assert.deepEqual(rpcCalls.pop(), ['ly_save_product', { p_product:{name:'P'}, p_recipe_items:[{ingredient_id:'i1'}] }]);

  const imports = createDocumentRepository({ gateway, receiptTable:'ly_import_receipts', itemTable:'ly_import_items', rpcName:'ly_save_import', deleteType:'import' });
  await imports.save({ code:'N1' }, [{ qty:2 }]);
  assert.deepEqual(rpcCalls.pop(), ['ly_save_import', { p_header:{code:'N1'}, p_items:[{qty:2}] }]);
  await imports.remove('r1');
  assert.deepEqual(rpcCalls.pop(), ['ly_delete_receipt', { p_type:'import', p_id:'r1' }]);

  const sales = createSalesRepository({ gateway });
  await sales.save({ code:'S1' }, [{ qty:1 }], [{ ingredient_id:'i1', qty:1 }]);
  assert.deepEqual(rpcCalls.pop(), ['ly_save_sale', { p_header:{code:'S1'}, p_sale_items:[{qty:1}], p_stock_lines:[{ingredient_id:'i1',qty:1}] }]);
}

{
  const client = { from(){ return {}; }, rpc(){ return Promise.resolve({data:null,error:null}); } };
  const core = createFreshCoreV2({ supabase:client });
  let panel=''; core.events.on('panel:changed', value => { panel=value; });
  core.setOrg('org-1'); core.setPanel('sales');
  assert.equal(core.store.getState().orgId,'org-1');
  assert.equal(core.store.getState().activePanel,'sales');
  assert.equal(panel,'sales');
  assert.equal(core.version,'2.1.0-domain-core');
  assert.ok(core.domains.ingredients && core.domains.products && core.domains.imports && core.domains.exports && core.domains.stocktake && core.domains.sales && core.domains.cashflow);
}

console.log('Fresh Core V2 domain contracts: PASS');
