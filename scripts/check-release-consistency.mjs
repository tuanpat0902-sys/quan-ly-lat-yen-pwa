import fs from 'node:fs/promises';

const cfg=JSON.parse(await fs.readFile('release-config.json','utf8'));
const read=path=>fs.readFile(path,'utf8');
const [app,runtime,loader,sw,pkg]=await Promise.all([
  read('ly-app-version.js'),
  read('runtime-version.json'),
  read('ly-module-loader.js'),
  read('sw.js'),
  read('package.json')
]);
const runtimeJson=JSON.parse(runtime),pkgJson=JSON.parse(pkg);
const checks=[
  ['app-version VERSION',app.includes(`const VERSION='${cfg.appVersion}'`)],
  ['app-version revision',app.includes(`REVISION='${cfg.revision}'`)],
  ['runtime appVersion',runtimeJson.appVersion===cfg.appVersion],
  ['runtime revision',runtimeJson.revision===cfg.revision],
  ['runtime serviceWorker',runtimeJson.serviceWorker===cfg.serviceWorker],
  ['package version',pkgJson.version===cfg.appVersion],
  ['module loader runtime version',loader.includes(`const VERSION='${cfg.moduleLoaderVersion}'`)],
  ['module loader app asset',loader.includes(`ly-app-version.js?v=${cfg.appVersion}`)],
  ['module loader app test',loader.includes(`window.__lyAppVersion?.version==='${cfg.appVersion}'`)],
  ['service worker cache',sw.includes(`const CACHE='${cfg.serviceWorker}'`)]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
if(failed.length)throw new Error('Release consistency failed: '+failed.join(', '));
console.log(`Release consistency: PASS (Ver ${cfg.appVersion}, ${cfg.serviceWorker})`);
