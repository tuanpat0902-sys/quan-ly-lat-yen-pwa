// Trigger Adaptive Leader V3 workflow after workflow installation.
import fs from 'node:fs';
const file='sw.js';
let s=fs.readFileSync(file,'utf8');
s=s.replace("lat-yen-legacy-ui-fresh-core-36","lat-yen-legacy-ui-fresh-core-37");
s=s.replace('ly-performance-optimizer.js?v=20260823.2','ly-performance-optimizer.js?v=20260823.3');
if(!s.includes("lat-yen-legacy-ui-fresh-core-37"))throw new Error('Core-37 marker missing');
if(!s.includes('ly-performance-optimizer.js?v=20260823.3'))throw new Error('Performance V3 query missing');
fs.writeFileSync(file,s);
console.log('Applied Performance V3 / Core-37 wiring');
