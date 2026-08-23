import fs from 'node:fs';
import path from 'node:path';

// Analyzer revision 2: trigger full-source analysis on GitHub runner.
const srcPath='index.html';
const src=fs.readFileSync(srcPath,'utf8');
const outDir='refactor';
fs.mkdirSync(outDir,{recursive:true});

function lineOf(pos){return src.slice(0,pos).split('\n').length;}
function extractFunctionAt(start){
  const brace=src.indexOf('{',start);
  if(brace<0)throw new Error('Function opening brace not found');
  let depth=0, quote='', escaped=false, lineComment=false, blockComment=false, templateDepth=0;
  for(let i=brace;i<src.length;i++){
    const c=src[i],n=src[i+1];
    if(lineComment){if(c==='\n')lineComment=false;continue;}
    if(blockComment){if(c==='*'&&n==='/'){blockComment=false;i++;}continue;}
    if(quote){
      if(escaped){escaped=false;continue;}
      if(c==='\\'){escaped=true;continue;}
      if(quote==='`'&&c==='$'&&n==='{'){templateDepth++;depth++;i++;continue;}
      if(c===quote && !(quote==='`'&&templateDepth>0)){quote='';continue;}
      if(quote==='`'&&c==='}'&&templateDepth>0){templateDepth--;depth--;continue;}
      continue;
    }
    if(c==='/'&&n==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&n==='*'){blockComment=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'){
      depth--;
      if(depth===0)return {start,end:i+1,code:src.slice(start,i+1)};
    }
  }
  throw new Error('Unbalanced function');
}

const declRe=/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
const functions=[];
let m;
while((m=declRe.exec(src))){
  const name=m[1];
  if(!/(history|audit)/i.test(name))continue;
  try{
    const item=extractFunctionAt(m.index);
    functions.push({name,...item,startLine:lineOf(item.start),endLine:lineOf(item.end)});
    declRe.lastIndex=item.end;
  }catch(e){
    functions.push({name,start:m.index,end:m.index,startLine:lineOf(m.index),endLine:lineOf(m.index),error:String(e)});
  }
}

const render=functions.find(f=>f.name==='renderHistory');
if(!render)throw new Error('renderHistory() was not found; refusing to generate extraction candidate');

function identifiers(code){
  const set=new Set();
  for(const x of code.matchAll(/\b([A-Za-z_$][\w$]*)\b/g))set.add(x[1]);
  const ignored=new Set(['function','const','let','var','if','else','for','while','return','true','false','null','undefined','new','this','typeof','instanceof','in','of','try','catch','finally','throw','async','await','class','switch','case','break','continue','default','delete','void','yield','document','window','Math','Date','JSON','Object','Array','String','Number','Boolean','Set','Map','Intl','console']);
  return [...set].filter(x=>!ignored.has(x));
}

const declared=new Set(functions.map(f=>f.name));
const refs=identifiers(render.code).filter(x=>!declared.has(x));
const localDecl=new Set([...render.code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)].map(x=>x[1]));
const params=new Set((render.code.match(/^\s*(?:async\s+)?function\s+renderHistory\s*\(([^)]*)\)/)?.[1]||'').split(',').map(s=>s.trim()).filter(Boolean));
const externalRefs=refs.filter(x=>!localDecl.has(x)&&!params.has(x)).sort();

const candidateFns=functions.filter(f=>!f.error);
const candidate=`/* AUTO-GENERATED ANALYSIS CANDIDATE — NOT LOADED BY PRODUCTION */\n(()=>{\n'use strict';\n\n${candidateFns.map(f=>`// ${f.name}: index.html lines ${f.startLine}-${f.endLine}\n${f.code}`).join('\n\n')}\n\n})();\n`;
fs.writeFileSync(path.join(outDir,'history-candidate.js'),candidate);

const bytes=candidateFns.reduce((n,f)=>n+Buffer.byteLength(f.code),0);
const report=[
  '# History extraction analysis',
  '',
  `- index.html bytes: ${Buffer.byteLength(src)}`,
  `- renderHistory lines: ${render.startLine}-${render.endLine}`,
  `- renderHistory bytes: ${Buffer.byteLength(render.code)}`,
  `- history/audit named functions found: ${candidateFns.length}`,
  `- combined candidate bytes: ${bytes}`,
  '',
  '## Candidate functions',
  ...candidateFns.map(f=>`- \`${f.name}\`: lines ${f.startLine}-${f.endLine}, ${Buffer.byteLength(f.code)} bytes`),
  '',
  '## Possible external references used by renderHistory',
  '',
  externalRefs.map(x=>`\`${x}\``).join(', '),
  '',
  '## Safety',
  '',
  'This analysis does not modify index.html. Production extraction must only proceed after reviewing this report/candidate and passing npm run validate.'
].join('\n');
fs.writeFileSync(path.join(outDir,'history-analysis.md'),report);
console.log(report);
