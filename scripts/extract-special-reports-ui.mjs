import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const indexPath='index.html';
let src=fs.readFileSync(indexPath,'utf8');
const targets=[
  ['renderImportReport','formatVNDate'],
  ['renderExportReport','addExportReceiptLine'],
  ['renderSaleReport','drawSaleReportCharts'],
];
if(targets.every(([name])=>!new RegExp(`\\bfunction\\s+${name}\\s*\\(`).test(src))){console.log('Special Reports UI already extracted');process.exit(0);}
const spans=[];
for(const [name,next] of targets){
  const start=src.indexOf(`function ${name}(`),end=src.indexOf(`function ${next}(`,start);
  if(start<0||end<0||end<=start)throw new Error(`Extraction markers not found for ${name}`);
  const original=src.slice(start,end).trim();
  if(!original.startsWith(`function ${name}(`))throw new Error(`Unexpected source for ${name}`);
  spans.push({name,next,start,end,original});
}
const moduleBody=spans.map(x=>x.original.split('\n').map(line=>'  '+line).join('\n')).join('\n\n');
const assignments=spans.map(x=>`  window.${x.name}=${x.name};`).join('\n');
const wrapped=`/* Lát Yên — Special Reports UI V1\n   Read-only report renderers extracted from Legacy index.html. Core business/save/chart helpers remain resident. */\n(()=>{\n  'use strict';\n  if(window.__lySpecialReportsModule)return;\n${moduleBody}\n\n${assignments}\n  window.__lySpecialReportsModule={version:'2026.08.23.1'};\n})();\n`;
fs.writeFileSync('ly-special-reports.js',wrapped);
const check=spawnSync(process.execPath,['--check','ly-special-reports.js'],{encoding:'utf8'});
if(check.status!==0)throw new Error(check.stderr||'ly-special-reports.js syntax failed');
const before=Buffer.byteLength(src);
for(const x of [...spans].sort((a,b)=>b.start-a.start))src=src.slice(0,x.start)+`/* ${x.name} extracted to ly-special-reports.js */\n\n`+src.slice(x.end);
fs.writeFileSync(indexPath,src);
const after=Buffer.byteLength(src);
fs.mkdirSync('refactor',{recursive:true});
fs.writeFileSync('refactor/special-reports-extraction-result.md',`# Special Reports UI extraction result\n\n- index.html before: ${before} bytes\n- index.html after: ${after} bytes\n- index.html reduction: ${before-after} bytes\n- module file: ly-special-reports.js (${Buffer.byteLength(wrapped)} bytes)\n\nExtracted:\n${spans.map(x=>`- ${x.name}: ${Buffer.byteLength(x.original)} bytes`).join('\n')}\n\nKept in Legacy core: formatVNDate, addExportReceiptLine, drawSaleReportCharts and all save/business logic.\nModule syntax check: PASS.\n`);
console.log(`Special Reports extracted: ${before-after} bytes removed from index.html`);
