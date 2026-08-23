import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const indexPath='index.html';
let src=fs.readFileSync(indexPath,'utf8');
if(!/\bfunction\s+renderReports\s*\(/.test(src)){
  console.log('renderReports already extracted');
  process.exit(0);
}
const start=src.indexOf('function renderReports(');
const end=src.indexOf('function drawReportCharts(',start);
if(start<0||end<0||end<=start)throw new Error('Reports extraction markers not found');
const original=src.slice(start,end).trim();
if(!original.includes('E.reports')&&!original.includes('reports'))throw new Error('Unexpected renderReports source');
const wrapped=`/* Lát Yên — Reports UI V1\n   Extracted from Legacy index.html. Report calculations/charts remain in Legacy core. */\n(()=>{\n  'use strict';\n  if(window.__lyReportsModule)return;\n  window.__lyReportsModule={version:'2026.08.23.1'};\n\n${original.split('\n').map(x=>'  '+x).join('\n')}\n\n  window.__lyReportsModule.renderReports=renderReports;\n})();\n`;
fs.writeFileSync('ly-reports.js',wrapped);
const check=spawnSync(process.execPath,['--check','ly-reports.js'],{encoding:'utf8'});
if(check.status!==0)throw new Error(check.stderr||'ly-reports.js syntax failed');
const before=Buffer.byteLength(src);
src=src.slice(0,start)+'/* renderReports extracted to ly-reports.js */\n\n'+src.slice(end);
fs.writeFileSync(indexPath,src);
const after=Buffer.byteLength(src);
fs.mkdirSync('refactor',{recursive:true});
fs.writeFileSync('refactor/reports-extraction-result.md',`# Reports UI extraction result\n\n- index.html before: ${before} bytes\n- index.html after: ${after} bytes\n- index.html reduction: ${before-after} bytes\n- extracted source span: ${Buffer.byteLength(original)} bytes\n- module file: ly-reports.js (${Buffer.byteLength(wrapped)} bytes)\n\nReport calculations and drawReportCharts remain in Legacy core.\nModule syntax check: PASS.\n`);
console.log(`Reports extracted: ${before-after} bytes removed from index.html`);
