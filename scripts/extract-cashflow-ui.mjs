// Trigger Cashflow UI extraction after workflow install. Retry 2.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const indexPath='index.html';
let src=fs.readFileSync(indexPath,'utf8');
if(!/\bfunction\s+renderCashflow\s*\(/.test(src)&&!/\bfunction\s+renderCashflowReport\s*\(/.test(src)){
  console.log('Cashflow UI already extracted');
  process.exit(0);
}
const start=src.indexOf('function renderCashflow(');
const end=src.indexOf('function isInventoryPurchaseCashflow(',start);
if(start<0||end<0||end<=start)throw new Error('Cashflow extraction markers not found');
const original=src.slice(start,end).trim();
if(!original.includes('function renderCashflow(')||!original.includes('function renderCashflowReport('))throw new Error('Unexpected Cashflow source span');
const wrapped=`/* Lát Yên — Cashflow UI V1\n   Extracted from Legacy index.html. Cashflow persistence/business rules remain in Legacy core. */\n(()=>{\n  'use strict';\n  if(window.__lyCashflowModule)return;\n  window.__lyCashflowModule={version:'2026.08.23.1'};\n\n${original.split('\n').map(x=>'  '+x).join('\n')}\n\n  window.__lyCashflowModule.renderCashflow=renderCashflow;\n  window.__lyCashflowModule.renderCashflowReport=renderCashflowReport;\n})();\n`;
fs.writeFileSync('ly-cashflow.js',wrapped);
const check=spawnSync(process.execPath,['--check','ly-cashflow.js'],{encoding:'utf8'});
if(check.status!==0)throw new Error(check.stderr||'ly-cashflow.js syntax failed');
const before=Buffer.byteLength(src);
src=src.slice(0,start)+'/* Cashflow UI extracted to ly-cashflow.js */\n\n'+src.slice(end);
fs.writeFileSync(indexPath,src);
const after=Buffer.byteLength(src);
fs.mkdirSync('refactor',{recursive:true});
fs.writeFileSync('refactor/cashflow-extraction-result.md',`# Cashflow UI extraction result\n\n- index.html before: ${before} bytes\n- index.html after: ${after} bytes\n- index.html reduction: ${before-after} bytes\n- extracted source span: ${Buffer.byteLength(original)} bytes\n- module file: ly-cashflow.js (${Buffer.byteLength(wrapped)} bytes)\n\nCashflow persistence/business rules remain in Legacy core.\nModule syntax check: PASS.\n`);
console.log(`Cashflow UI extracted: ${before-after} bytes removed from index.html`);
