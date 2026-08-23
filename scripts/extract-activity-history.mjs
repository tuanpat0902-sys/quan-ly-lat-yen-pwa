import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const INDEX='index.html';
const MODULE='ly-activity-history.js';
const REPORT='refactor/activity-history-extraction-result.md';
const TARGETS=['auditActionClass','auditFilterRows','renderHistory'];
const src=fs.readFileSync(INDEX,'utf8');
const beforeBytes=Buffer.byteLength(src);

function lineOf(pos){return src.slice(0,pos).split('\n').length;}
function findDecl(name){
  const re=new RegExp(`\\bfunction\\s+${name}\\s*\\(`,'g');
  const hits=[...src.matchAll(re)];
  if(hits.length!==1)throw new Error(`${name}: expected exactly one declaration, found ${hits.length}`);
  return hits[0].index;
}
function extractFunction(start){
  const brace=src.indexOf('{',start);
  if(brace<0)throw new Error('Opening brace not found');
  let depth=0,quote='',escaped=false,lineComment=false,blockComment=false,templateDepth=0;
  for(let i=brace;i<src.length;i++){
    const c=src[i],n=src[i+1];
    if(lineComment){if(c==='\n')lineComment=false;continue;}
    if(blockComment){if(c==='*'&&n==='/'){blockComment=false;i++;}continue;}
    if(quote){
      if(escaped){escaped=false;continue;}
      if(c==='\\'){escaped=true;continue;}
      if(quote==='`'&&c==='$'&&n==='{'){templateDepth++;depth++;i++;continue;}
      if(c===quote&&!(quote==='`'&&templateDepth>0)){quote='';continue;}
      if(quote==='`'&&c==='}'&&templateDepth>0){templateDepth--;depth--;continue;}
      continue;
    }
    if(c==='/'&&n==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&n==='*'){blockComment=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return {start,end:i+1,code:src.slice(start,i+1)};
  }
  throw new Error('Unbalanced function');
}

for(const required of ['function auditLog(','function loadAuditLog(','function saveAuditLog(','function debouncedHistoryRender(','function renderPanel(']){
  if(!src.includes(required))throw new Error(`Safety dependency missing before extraction: ${required}`);
}

const blocks=TARGETS.map(name=>({name,...extractFunction(findDecl(name))}));
const removedBytes=blocks.reduce((n,b)=>n+Buffer.byteLength(b.code),0);
if(removedBytes<4500||removedBytes>6500)throw new Error(`Unexpected extraction size ${removedBytes} bytes`);

const moduleSource=`/* Lát Yên — Activity History UI V1\n   Extracted from Legacy index.html. Audit persistence remains in Legacy core. */\n(()=>{\n  'use strict';\n  if(window.__lyActivityHistoryUIV1)return;\n  window.__lyActivityHistoryUIV1=true;\n  const VERSION='2026.08.23.1';\n\n${blocks.map(b=>b.code.split('\n').map(line=>'  '+line).join('\n')).join('\n\n')}\n\n  window.auditActionClass=auditActionClass;\n  window.auditFilterRows=auditFilterRows;\n  window.renderHistory=renderHistory;\n  window.__lyActivityHistoryModule={version:VERSION,render:renderHistory};\n})();\n`;
fs.writeFileSync(MODULE,moduleSource);

let next=src;
for(const b of [...blocks].sort((a,b)=>b.start-a.start)){
  next=next.slice(0,b.start)+`/* ${b.name} extracted to ${MODULE} */`+next.slice(b.end);
}

for(const name of TARGETS){
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
  `- extracted function source: ${removedBytes} bytes`,
  `- module file: ${MODULE} (${Buffer.byteLength(moduleSource)} bytes)`,
  '', '## Extracted UI functions',
  ...blocks.map(b=>`- \`${b.name}\`: original line ${lineOf(b.start)}`),
  '', '## Kept in Legacy core',
  '- `compactAuditRows`', '- storage optimization helpers', '- `AUDIT_LOG_KEY`',
  '- `loadAuditLog`', '- `saveAuditLog`', '- `auditLog`', '- `debouncedHistoryRender`',
  '', 'Module syntax check: PASS.'
].join('\n'));

console.log(`Activity History extracted: index ${beforeBytes} -> ${afterBytes} bytes (-${beforeBytes-afterBytes})`);
