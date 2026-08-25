import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const INDEX='index.html';
const MODULE='ly-finance.js';
const REPORT='refactor/finance-extraction-result.md';
const src=fs.readFileSync(INDEX,'utf8');
const beforeBytes=Buffer.byteLength(src);

function uniquePos(marker){
  const first=src.indexOf(marker);
  if(first<0)throw new Error(`Missing marker: ${marker}`);
  if(src.indexOf(marker,first+1)>=0)throw new Error(`Marker not unique: ${marker}`);
  return first;
}
function lineOf(pos){return src.slice(0,pos).split('\n').length;}

for(const required of [
  'function financeInventorySnapshot(',
  'function financeInventoryPeriod(',
  'function financeSalesInRange(',
  'function financeSalaryCostInRange(',
  'function financeCashflowInRange(',
  'function drawFinanceTrend('
]) if(!src.includes(required))throw new Error(`Required Finance core missing: ${required}`);

const r1s=uniquePos('function renderFinance(');
const r1e=uniquePos('function financeDefaultFromDate(');
const r2s=uniquePos('function renderFinanceData(');
const r2e=uniquePos('function drawFinanceTrend(');
if(!(r1s<r1e&&r1e<r2s&&r2s<r2e))throw new Error('Unexpected Finance function order');

const blocks=[
  {name:'renderFinance',start:r1s,end:r1e,code:src.slice(r1s,r1e).trimEnd()},
  {name:'renderFinanceData',start:r2s,end:r2e,code:src.slice(r2s,r2e).trimEnd()}
];
const removedSpan=blocks.reduce((n,b)=>n+Buffer.byteLength(src.slice(b.start,b.end)),0);
if(removedSpan<18000||removedSpan>26000)throw new Error(`Unexpected Finance extraction size ${removedSpan}`);

const moduleSource=`/* Lát Yên — Finance UI V1\n   UI/render only. Finance calculations remain in Legacy core. */\n(()=>{\n  'use strict';\n  if(window.__lyFinanceUIV1)return;\n  window.__lyFinanceUIV1=true;\n  const VERSION='2026.08.25.1';\n\n${blocks.map(b=>b.code.split('\n').map(line=>'  '+line).join('\n')).join('\n\n')}\n\n  window.renderFinance=renderFinance;\n  window.renderFinanceData=renderFinanceData;\n  window.__lyFinanceModule={version:VERSION,render:renderFinance,renderData:renderFinanceData};\n})();\n`;
fs.writeFileSync(MODULE,moduleSource);

let next=src;
for(const b of [...blocks].sort((a,b)=>b.start-a.start)){
  next=next.slice(0,b.start)+`/* ${b.name} extracted to ${MODULE} */\n\n`+next.slice(b.end);
}
for(const fn of ['renderFinance','renderFinanceData']){
  if(new RegExp(`\\bfunction\\s+${fn}\\s*\\(`).test(next))throw new Error(`${fn} still present in index.html`);
}
for(const kept of ['financeInventorySnapshot','financeInventoryPeriod','financeSalesInRange','financeSalaryCostInRange','financeCashflowInRange','drawFinanceTrend']){
  if(!new RegExp(`\\bfunction\\s+${kept}\\s*\\(`).test(next))throw new Error(`Finance core lost ${kept}`);
}
fs.writeFileSync(INDEX,next);
const afterBytes=Buffer.byteLength(next);
if(afterBytes>=beforeBytes-18000)throw new Error(`index.html did not shrink enough: ${beforeBytes} -> ${afterBytes}`);

const syntax=spawnSync(process.execPath,['--check',MODULE],{encoding:'utf8'});
if(syntax.status!==0)throw new Error(`Finance module syntax failed:\n${syntax.stderr}`);

fs.mkdirSync('refactor',{recursive:true});
fs.writeFileSync(REPORT,[
  '# Finance UI extraction result','',
  `- index.html before: ${beforeBytes} bytes`,
  `- index.html after: ${afterBytes} bytes`,
  `- index.html reduction: ${beforeBytes-afterBytes} bytes`,
  `- extracted source spans: ${removedSpan} bytes`,
  `- module file: ${MODULE} (${Buffer.byteLength(moduleSource)} bytes)`,'',
  '## Extracted UI',
  ...blocks.map(b=>`- \`${b.name}\`: original line ${lineOf(b.start)}`),'',
  '## Kept in Legacy core',
  '- inventory snapshot / inventory period calculations',
  '- sales/import/salary/cashflow/stocktake range calculations',
  '- year/month breakdown helpers',
  '- trend drawing helper',
  '', 'Module syntax check: PASS.'
].join('\n'));
console.log(`Finance UI extracted: ${beforeBytes} -> ${afterBytes} bytes (-${beforeBytes-afterBytes})`);
