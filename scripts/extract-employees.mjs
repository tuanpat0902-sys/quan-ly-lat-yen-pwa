import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const INDEX='index.html';
const MODULE='ly-employees.js';
const REPORT='refactor/employees-extraction-result.md';
const src=fs.readFileSync(INDEX,'utf8');
const beforeBytes=Buffer.byteLength(src);

const startMarker='function renderEmployees(';
const start=src.indexOf(startMarker);
if(start<0)throw new Error('renderEmployees() not found');
if(src.indexOf(startMarker,start+1)>=0)throw new Error('renderEmployees() is not unique');

const after=src.slice(start+startMarker.length);
const nextMatch=/\nfunction\s+([A-Za-z_$][\w$]*)\s*\(/.exec(after);
if(!nextMatch)throw new Error('Could not find function following renderEmployees()');
const end=start+startMarker.length+nextMatch.index+1;
const nextName=nextMatch[1];
const code=src.slice(start,end).trimEnd();
const extractedBytes=Buffer.byteLength(code);
if(extractedBytes<1200||extractedBytes>30000)throw new Error(`Unexpected renderEmployees span: ${extractedBytes} bytes; next=${nextName}`);
if(!code.startsWith(startMarker))throw new Error('Employees extraction start mismatch');

for(const required of ['function loadEmployees(','function bindEmployeeActions(','function renderEmployeeAttendance(','function renderEmployeeSalaryReport(']){
  if(!src.includes(required))throw new Error(`Required employee dependency missing: ${required}`);
}

const moduleSource=`/* Lát Yên — Employees UI V1\n   Extracted from Legacy index.html. Employee data/payroll logic remains in Legacy core. */\n(()=>{\n  'use strict';\n  if(window.__lyEmployeesUIV1)return;\n  window.__lyEmployeesUIV1=true;\n  const VERSION='2026.08.25.2';\n\n${code.split('\n').map(line=>'  '+line).join('\n')}\n\n  window.renderEmployees=renderEmployees;\n  window.__lyEmployeesModule={version:VERSION,render:renderEmployees};\n})();\n`;
fs.writeFileSync(MODULE,moduleSource);

const replacement='/* renderEmployees extracted to ly-employees.js */\n';
const next=src.slice(0,start)+replacement+src.slice(end);
if(/\bfunction\s+renderEmployees\s*\(/.test(next))throw new Error('renderEmployees() still exists in index.html');
for(const required of ['function loadEmployees(','function bindEmployeeActions(','function renderEmployeeAttendance(','function renderEmployeeSalaryReport(']){
  if(!next.includes(required))throw new Error(`Extraction removed dependency: ${required}`);
}
fs.writeFileSync(INDEX,next);
const afterBytes=Buffer.byteLength(next);
if(afterBytes>=beforeBytes-1000)throw new Error(`index.html did not shrink enough: ${beforeBytes} -> ${afterBytes}`);

const syntax=spawnSync(process.execPath,['--check',MODULE],{encoding:'utf8'});
if(syntax.status!==0)throw new Error(`Employees module syntax failed:\n${syntax.stderr}`);

fs.mkdirSync('refactor',{recursive:true});
fs.writeFileSync(REPORT,[
  '# Employees UI extraction result','',
  `- index.html before: ${beforeBytes} bytes`,
  `- index.html after: ${afterBytes} bytes`,
  `- index.html reduction: ${beforeBytes-afterBytes} bytes`,
  `- extracted renderEmployees source: ${extractedBytes} bytes`,
  `- next function marker: ${nextName}`,
  `- module file: ${MODULE} (${Buffer.byteLength(moduleSource)} bytes)`,
  '',
  'Employee data, attendance, payroll calculations and persistence remain in Legacy core.',
  'Module syntax check: PASS.'
].join('\n'));
console.log(`Employees UI extracted: index ${beforeBytes} -> ${afterBytes} (-${beforeBytes-afterBytes}); next=${nextName}`);
