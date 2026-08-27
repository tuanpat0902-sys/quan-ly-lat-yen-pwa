import {EventBus} from '../core/events/event-bus.js';
import {createStore} from '../core/store/store.js';
import {createScheduler} from '../core/scheduler/scheduler.js';
import {createQueryCache} from '../core/cache/query-cache.js';
import {createRealtimeManager} from '../core/realtime/realtime-manager.js';
import {createFeatureRegistry} from './feature-registry.js';
import {createHealth} from '../core/diagnostics/health.js';
import {createV2Adapter} from '../compatibility/v2-adapter.js';
import {createGateway} from '../data/supabase/gateway.js';

export function createFreshCoreV3({supabase,v2Runtime,legacyShowTab,getOrgId,mode='shadow',initialState={}}={}){
  const events=new EventBus();
  const store=createStore({
    session:null,
    orgId:null,
    activePanel:'ingredients',
    connectivity:{online:true,realtime:false},
    migration:{mode},
    ...initialState
  });
  const scheduler=createScheduler();
  const cache=createQueryCache();
  const features=createFeatureRegistry();
  const gateway=createGateway({
    client:supabase,
    getOrgId:getOrgId??(()=>store.getState().orgId),
    allowedTables:new Set(['ly_warehouses','ly_suppliers']),
    allowedRpcs:new Set()
  });
  features.register({
    id:'master-data',
    load:()=>import('../domains/master-data/index.js')
  });
  const realtime=createRealtimeManager({client:supabase,getOrgId:getOrgId??(()=>store.getState().orgId),events});
  const v2=v2Runtime?createV2Adapter({v2:v2Runtime,events,legacyShowTab}):null;
  const authoritative=mode==='v3-shell';
  const version=authoritative?'3.0.0-shell.1':'3.0.0-shadow.2';
  const health=createHealth({version,store,scheduler,cache,realtime,features});

  function setOrg(orgId){store.patch({orgId},{source:'organization'});events.emit('org:changed',orgId);}
  function setPanel(activePanel){store.patch({activePanel},{source:'navigation'});events.emit('panel:changed',activePanel);}
  function destroy(){scheduler.stopAll();realtime.stopAll();events.clear();cache.clear();}

  return Object.freeze({
    version,
    mode,
    authoritative,
    authoritativeScope:Object.freeze(authoritative?['application-state','navigation']:[]),
    compatibilityScope:Object.freeze(['business-data','legacy-renderers']),
    events,store,scheduler,cache,realtime,features,gateway,v2,health,setOrg,setPanel,destroy
  });
}
