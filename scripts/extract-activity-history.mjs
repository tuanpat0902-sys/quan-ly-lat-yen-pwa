import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const INDEX='index.html';
const MODULE='ly-activity-history.js';
const REPORT='refactor/activity-history-extraction-result.md';
const src=fs.readFileSync(INDEX,'utf8');
const beforeBytes=Buffer.byteLength(src);

function lineOf(pos){return src.slice(0,pos).split('\n').length;}
function uniquePos(marker){
  const first=src.indexOf(marker);
  if(first<0)throw new Error(`Missing marker: ${marker}`);
  if(src.indexOf(marker,first+1)>=0)throw new Error(`Marker is not unique: ${marker}`);
  return first;
}

for(const required of ['function auditLog(','function loadAuditLog(','function saveAuditLog(','function debouncedHistoryRender(','function renderPanel(']){
  if(!src.includes(required))throw new Error(`Safety dependency missing before extraction: ${required}`);
}

const startAction=uniquePos('function auditActionClass(');
const startFilter=uniquePos('function auditFilterRows(');
const startRender=uniquePos('function renderHistory(');
if(!(startAction<startFilter&&startFilter<startRender))throw new Error('Unexpected Activity History function order');

const renderTail="          `:'<div class=\"empty\">Chưa có biến động kho.</div>'}\n        </div>\n      </details>\n    </div>\n  `;\n}";
const renderTailPos=uniquePos(renderTail);
const endRender=renderTailPos+renderTail.length;
if(endRender<=startRender)throw new Error('renderHistory tail occurs before its declaration');

const blocks=[
  {name:'auditActionClass',start:startAction,end:startFilter},
  {name:'auditFilterRows',start:startFilter,end:startRender},
  {name:'renderHistory',start:startRender,end:endRender}
].map(b=>({...b,code:src.slice(b.start,b.end).trimEnd()}));

for(const b of blocks){
  if(!b.code.startsWith(`function ${b.name}(`))throw new Error(`${b.name}: extraction start mismatch`);
}
const removedBytes=blocks.reduce((n,b)=>n+Buffer.byteLength(src.slice(b.start,b.end)),0);
if(removedBytes<4500||removedBytes>7000)throw new Error(`Unexpected extraction size ${removedBytes} bytes`);

const moduleSource=`/* Lát Yên — Activity History UI V1\n   Extracted from Legacy index.html. Audit persistence remains in Legacy core. */\n(()=>{\n  'use strict';\n  if(window.__lyActivityHistoryUIV1)return;\n  window.__lyActivityHistoryUIV1=true;\n  const VERSION='2026.08.23.1';\n\n${blocks.map(b=>b.code.split('\n').map(line=>'  '+line).join('\n')).join('\n\n')}\n\n  window.auditActionClass=auditActionClass;\n  window.auditFilterRows=auditFilterRows;\n  window.renderHistory=renderHistory;\n  window.__lyActivityHistoryModule={version:VERSION,render:renderHistory};\n})();\n`;
fs.writeFileSync(MODULE,moduleSource);

let next=src;
for(const b of [...blocks].sort((a,b)=>b.start-a.start)){
  next=next.slice(0,b.start)+`/* ${b.name} extracted to ${MODULE} */\n\n`+next.slice(b.end);
}

for(const name of ['auditActionClass','auditFilterRows','renderHistory']){
  if(new RegExp(`\\bfunction\\s+${name}\\s*\\(`).test(next))throw new Error(`${name} still exists in index.html`);
}
for(const required of ['function auditLog(','function loadAuditLog(','function saveAuditLog(','function debouncedHistoryRender(']){
  if(!next.includes(required))throw new Error(`Extraction removed required Legacy function: ${required}`);
}

fs.writeFileSync(INDEX,next);
const afterBytes=Buffer.byteLength(next);
if(afterBytes>=beforeBytes-4500)throw new Error(`index.html did not shrink enough: ${beforeBytes} -> ${afterBytes}`);

const syntax=spawnSync(process.execPath,['--check',MODULE],{encoding:'utf8'});
if(syntax.status!==0)throw new Error(`Module syntax failed:\n${syntax.stderr}`);

fs.mkdirSync('refactor',{recursive:true});
fs.writeFileSync(REPORT,[
  '# Activity History extraction result','',
  `- index.html before: ${beforeBytes} bytes`,
  `- index.html after: ${afterBytes} bytes`,
  `- index.html reduction: ${beforeBytes-afterBytes} bytes`,
  `- extracted source span: ${removedBytes} bytes`,
  `- module file: ${MODULE} (${Buffer.byteLength(moduleSource)} bytes)`,
  '', '## Extracted UI functions',
  ...blocks.map(b=>`- \`${b.name}\`: original line ${lineOf(b.start)}`),
  '', '## Kept in Legacy core',
  '- `compactAuditRows`', '- storage optimization helpers', '- `AUDIT_LOG_KEY`',
  '- `loadAuditLog`', '- `saveAuditLog`', '- `auditLog`', '- `debouncedHistoryRender`',
  '', 'Module syntax check: PASS.'
].join('\n'));

console.log(`Activity History extracted: index ${beforeBytes} -> ${afterBytes} bytes (-${beforeBytes-afterBytes})`);
