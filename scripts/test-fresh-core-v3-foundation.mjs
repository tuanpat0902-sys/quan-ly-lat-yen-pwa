import assert from 'node:assert/strict';
import {createStore} from '../src-v3/core/store/store.js';
import {EventBus} from '../src-v3/core/events/event-bus.js';
import {createQueryCache} from '../src-v3/core/cache/query-cache.js';
import {createScheduler} from '../src-v3/core/scheduler/scheduler.js';
import {createFeatureRegistry} from '../src-v3/app/feature-registry.js';

const store=createStore({activePanel:'ingredients'});
let seen='';
const off=store.subscribe(state=>{seen=state.activePanel;});
store.patch({activePanel:'sales'});
assert.equal(seen,'sales');off();

const events=new EventBus();
let payload=0;
const stop=events.on('test',value=>payload=value);
events.emit('test',7);assert.equal(payload,7);stop();

let now=1000;
const cache=createQueryCache({now:()=>now,defaultTtlMs:100,maxEntries:2});
cache.set('a',{x:1});assert.deepEqual(cache.get('a').value,{x:1});
now=1200;assert.equal(cache.get('a'),null);
cache.set('b',2);cache.set('c',3);cache.set('d',4);assert.equal(cache.status().size,2);

const timers=[];
const scheduler=createScheduler({
  now:()=>now,
  isOnline:()=>true,
  isHidden:()=>false,
  setTimer:(fn,ms)=>{const token={fn,ms};timers.push(token);return token;},
  clearTimer:()=>{}
});
let runs=0;
scheduler.register({id:'once',repeat:false,autoStart:false,run:async()=>{runs++;}});
await scheduler.run('once','test');assert.equal(runs,1);

const features=createFeatureRegistry();
features.register({id:'demo',load:async()=>({activate:async()=>({ready:true})})});
const instance=await features.activate('demo',{});
assert.equal(instance.ready,true);
assert.equal(features.status().demo.phase,'active');

console.log('Fresh Core V3 foundation: PASS');
