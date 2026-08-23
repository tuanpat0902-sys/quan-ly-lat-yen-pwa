import fs from 'node:fs';
import path from 'node:path';

// Analyzer revision 5: trigger validated Activity History extraction job.
const srcPath='index.html';
const src=fs.readFileSync(srcPath,'utf8');
const outDir='refactor';
fs.mkdirSync(outDir,{recursive:true});
const ACTIVITY_NAMES=new Set([
  'compactAuditRows','loadAuditLog','saveAuditLog','auditLog',
  'auditActionClass','auditFilterRows','renderHistory'
]);

function lineOf(pos){return src.slice(0,pos).split('\n').length;}
function extractFunctionAt(start){
  const brace=src.indexOf('{',start);
  if(brace<0)throw new Error('Function opening brace not found');
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

const declRe=/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
const allNamed=[];
let m;
while((m=declRe.exec(src))){
  const name=m[1];
  if(!/(history|audit)/i.test(name))continue;
  try{
    const item=extractFunctionAt(m.index);
    allNamed.push({name,...item,startLine:lineOf(item.start),endLine:lineOf(item.end)});
    declRe.lastIndex=item.end;
  }catch(e){allNamed.push({name,error:String(e),start:m.index,startLine:lineOf(m.index)});}
}

const activityFns=[...ACTIVITY_NAMES].map(name=>{
  const f=allNamed.find(x=>x.name===name&&!x.error);
  if(!f)throw new Error(`Required Activity History function missing: ${name}`);
  return f;
}).sort((a,b)=>a.start-b.start);

const first=activityFns[0],last=activityFns[activityFns.length-1];
const region=src.slice(first.start,last.end);
const expectedJoined=activityFns.map(f=>f.code).join('');
const hasUnexpectedInterstitial=region.replace(/\s+/g,'')!==expectedJoined.replace(/\s+/g,'');

const moduleCandidate=`/* AUTO-GENERATED ACTIVITY HISTORY CANDIDATE — NOT LOADED BY PRODUCTION */\n${activityFns.map(f=>`// ${f.name}: index.html lines ${f.startLine}-${f.endLine}\n${f.code}`).join('\n\n')}\n`;
fs.writeFileSync(path.join(outDir,'activity-history-block.js'),moduleCandidate);
fs.writeFileSync(path.join(outDir,'activity-history-region.txt'),region);

const bytes=activityFns.reduce((n,f)=>n+Buffer.byteLength(f.code),0);
const regionBytes=Buffer.byteLength(region);
const report=[
  '# Activity History extraction analysis','',
  `- index.html bytes: ${Buffer.byteLength(src)}`,
  `- target range: lines ${first.startLine}-${last.endLine}`,
  `- target function bytes: ${bytes}`,
  `- exact region bytes: ${regionBytes}`,
  `- interstitial bytes: ${regionBytes-bytes}`,
  `- target functions: ${activityFns.length}`,
  `- unexpected code/comments between target functions: ${hasUnexpectedInterstitial?'YES':'NO'}`,
  '', '## Exact target functions',
  ...activityFns.map(f=>`- \`${f.name}\`: lines ${f.startLine}-${f.endLine}, ${Buffer.byteLength(f.code)} bytes`),
  '', '## Other history/audit functions intentionally excluded',
  ...allNamed.filter(f=>!ACTIVITY_NAMES.has(f.name)).map(f=>`- \`${f.name}\`: line ${f.startLine}${f.error?' (parse warning)':''}`),
  '', '## Extraction gate','',
  hasUnexpectedInterstitial
    ? 'BLOCKED: inspect refactor/activity-history-region.txt to include required interstitial declarations before extraction.'
    : 'Candidate functions form a clean contiguous block. Dependency review is still required before removal.',
  '', 'Production index.html is unchanged by this analysis.'
].join('\n');
fs.writeFileSync(path.join(outDir,'history-analysis.md'),report);
console.log(report);
