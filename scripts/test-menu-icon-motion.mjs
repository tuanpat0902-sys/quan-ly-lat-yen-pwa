import fs from 'node:fs';
const js=fs.readFileSync(new URL('../ly-menu-security.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const visuals=fs.readFileSync(new URL('../ly-sidebar-visuals.js',import.meta.url),'utf8');
for(const term of ['width:24px','@keyframes lyLockBreathe','@keyframes lyLockOpen','prefers-reduced-motion:reduce'])if(!js.includes(term))throw new Error(`Missing lock motion contract: ${term}`);
for(const term of ['min-height:44px!important','width:32px!important','width:18px!important'])if(!visuals.includes(term))throw new Error(`Missing readable menu icon contract: ${term}`);
if(!html.includes('ly-menu-security.js?v=20260824.3'))throw new Error('Security cache query was not bumped');
console.log('Readable menu icons and animated lock: PASS');
