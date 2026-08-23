import assert from 'node:assert/strict';
import { EventBus } from '../src-v2/core/event-bus.js';
import { createStore } from '../src-v2/core/store.js';
import { createSupabaseGateway } from '../src-v2/data/supabase-gateway.js';
import { createFreshCoreV2 } from '../src-v2/bootstrap.js';

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
}

{
  const client = { from(){ return {}; }, rpc(){ return Promise.resolve({data:null,error:null}); } };
  const core = createFreshCoreV2({ supabase:client });
  let panel=''; core.events.on('panel:changed', value => { panel=value; });
  core.setOrg('org-1'); core.setPanel('sales');
  assert.equal(core.store.getState().orgId,'org-1');
  assert.equal(core.store.getState().activePanel,'sales');
  assert.equal(panel,'sales');
}

console.log('Fresh Core V2 foundation contracts: PASS');
