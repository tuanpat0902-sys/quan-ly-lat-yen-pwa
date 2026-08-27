import fs from 'node:fs';
import path from 'node:path';

const root='src-v3';
const required=[
  'ARCHITECTURE.md','architecture-contract.json','migration-plan.json','README.md',
  'app/bootstrap.js','app/feature-registry.js',
  'core/events/event-bus.js','core/store/store.js','core/scheduler/scheduler.js',
  'core/cache/query-cache.js','core/realtime/realtime-manager.js','core/diagnostics/health.js',
  'data/supabase/gateway.js','compatibility/v2-adapter.js'
];
const failures=[];
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const full=path.join(dir,entry.name);
  return entry.isDirectory()?walk(full):[full];
});
for(const rel of required)if(!fs.existsSync(path.join(root,rel)))failures.push('missing '+rel);
const files=walk(root).filter(file=>file.endsWith('.js'));
for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  if(/setInterval\s*\(/.test(src))failures.push(`setInterval is forbidden in V3: ${file}`);
  if(/service[_-]?role/i.test(src))failures.push(`service-role marker is forbidden in V3 runtime: ${file}`);
  const rel=file.replace(/\\/g,'/');
  const dataOwned=rel.includes('/data/')||rel.includes('/core/realtime/');
  if(!dataOwned&&/(?:\.from\s*\(|\.rpc\s*\(|\.channel\s*\()/.test(src))failures.push(`direct Supabase transport outside data/realtime layer: ${file}`);
}
const bootstrap=fs.readFileSync(path.join(root,'app/bootstrap.js'),'utf8');
if(!bootstrap.includes("mode:'shadow'")||!bootstrap.includes("authoritative:false"))failures.push('V3 bootstrap must remain shadow-only');
const plan=JSON.parse(fs.readFileSync(path.join(root,'migration-plan.json'),'utf8'));
if(plan.dualWrite!==false)failures.push('migration plan must forbid dual-write');
if(plan.rollback?.required!==true)failures.push('migration plan must require per-domain rollback');
if(failures.length){
  console.error('Fresh Core V3 architecture: FAIL');
  for(const failure of failures)console.error('- '+failure);
  process.exit(1);
}
console.log(`Fresh Core V3 architecture: PASS (${files.length} runtime files checked)`);
