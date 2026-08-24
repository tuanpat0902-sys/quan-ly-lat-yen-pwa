import fs from 'node:fs/promises';
import vm from 'node:vm';

const files=['ly-legacy-state-shim.js','ly-legacy-helper-shim.js','ly-legacy-model-shim.js','ly-legacy-list-shim.js'];
const sandbox={console,Intl,Date,Math,Number,String,Object,Array,JSON,Symbol,Proxy,Reflect,RegExp,Set,Map,Promise,setTimeout,clearTimeout};
sandbox.window=sandbox;
sandbox.CustomEvent=class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail}};
sandbox.addEventListener=()=>{};
sandbox.dispatchEvent=()=>true;
vm.createContext(sandbox);
for(const file of files){const src=await fs.readFile(file,'utf8');vm.runInContext(src,sandbox,{filename:file});}

const checks=[
 ['money exported',typeof sandbox.money==='function'],
 ['money formats',String(sandbox.money(1234)).includes('1.234')],
 ['esc exported',typeof sandbox.esc==='function'],
 ['cashflowEditId exists','cashflowEditId' in sandbox],
 ['cashflowFormOpen boolean',typeof sandbox.cashflowFormOpen==='boolean'],
 ['cashflowRange callable',typeof sandbox.cashflowRange==='function'],
 ['cashflowRange fields',['from','to','start','end'].every(k=>k in sandbox.cashflowRange)],
 ['cashflowFilteredList callable',typeof sandbox.cashflowFilteredList==='function'],
 ['cashflowFilteredList array result',Array.isArray(sandbox.cashflowFilteredList())],
 ['warehouse callable',typeof sandbox.warehouse==='function'],
 ['ingredient callable',typeof sandbox.ingredient==='function'],
 ['product callable',typeof sandbox.product==='function'],
 ['state shim current',sandbox.__lyLegacyStateShim?.version==='2026.08.24.4'],
 ['helper shim current',sandbox.__lyLegacyHelperShim?.version==='2026.08.24.2'],
 ['model shim current',sandbox.__lyLegacyModelShim?.version==='2026.08.24.2'],
 ['list shim current',sandbox.__lyLegacyListShim?.version==='2026.08.24.1']
];
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${name}`);
if(failed.length) throw new Error(`Legacy compatibility contract failed: ${failed.map(([n])=>n).join(', ')}`);
console.log(`Legacy compatibility contract: PASS (${checks.length} checks)`);
