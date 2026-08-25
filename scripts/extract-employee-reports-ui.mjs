import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const indexPath='index.html';
let src=fs.readFileSync(indexPath,'utf8');
const targets=[
  ['renderEmployeePayrollTable','previewPayrollRow'],
  ['renderEmployeeAttendance','toggleAttendanceEmployee'],
  ['renderEmployeeReport','drawEmployeeWorkChart'],
  ['renderEmployeeSalaryReport','toggleSalaryReportSource'],
];
if(targets.every(([name])=>!new RegExp(`\\bfunction\\s+${name}\\s*\\(`).test(src))){console.log('Employee Reports UI already extracted');process.exit(0);}
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
const wrapped=`/* Lát Yên — Employee Reports UI V1\n   Employee attendance/payroll/report renderers extracted from Legacy index.html. Data, payroll rules and action helpers remain resident. */\n(()=>{\n  'use strict';\n  if(window.__lyEmployeeReportsModule)return;\n${moduleBody}\n\n${assignments}\n  window.__lyEmployeeReportsModule={version:'2026.08.25.1'};\n})();\n`;
fs.writeFileSync('ly-employee-reports.js',wrapped);
const check=spawnSync(process.execPath,['--check','ly-employee-reports.js'],{encoding:'utf8'});
if(check.status!==0)throw new Error(check.stderr||'ly-employee-reports.js syntax failed');
const before=Buffer.byteLength(src);
for(const x of [...spans].sort((a,b)=>b.start-a.start))src=src.slice(0,x.start)+`/* ${x.name} extracted to ly-employee-reports.js */\n\n`+src.slice(x.end);
fs.writeFileSync(indexPath,src);
const after=Buffer.byteLength(src);
fs.mkdirSync('refactor',{recursive:true});
fs.writeFileSync('refactor/employee-reports-extraction-result.md',`# Employee Reports UI extraction result\n\n- index.html before: ${before} bytes\n- index.html after: ${after} bytes\n- index.html reduction: ${before-after} bytes\n- module file: ly-employee-reports.js (${Buffer.byteLength(wrapped)} bytes)\n\nExtracted:\n${spans.map(x=>`- ${x.name}: ${Buffer.byteLength(x.original)} bytes`).join('\n')}\n\nKept in Legacy core: previewPayrollRow, toggleAttendanceEmployee, drawEmployeeWorkChart, toggleSalaryReportSource and employee/payroll data logic.\nModule syntax check: PASS.\n`);
console.log(`Employee Reports extracted: ${before-after} bytes removed from index.html`);
