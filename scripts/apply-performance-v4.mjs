import fs from 'node:fs';
const file='sw.js';let s=fs.readFileSync(file,'utf8');
s=s.replace("lat-yen-legacy-ui-fresh-core-37","lat-yen-legacy-ui-fresh-core-38");
s=s.replace('ly-performance-optimizer.js?v=20260823.3','ly-performance-optimizer.js?v=20260823.4');
if(!s.includes("lat-yen-legacy-ui-fresh-core-38"))throw new Error('Core-38 marker missing');
if(!s.includes('ly-performance-optimizer.js?v=20260823.4'))throw new Error('Performance V4 query missing');
fs.writeFileSync(file,s);console.log('Applied Performance V4 / Core-38 wiring');
