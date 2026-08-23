import fs from 'node:fs';

const src=fs.readFileSync('index.html','utf8');
const targets=['renderFinance','renderFinanceData'];
const decl=/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g;
const all=[];
let m;
while((m=decl.exec(src)))all.push({name:m[1],start:m.index});
function lineOf(pos){return src.slice(0,pos).split('\n').length;}
function nextDecl(name){
  const i=all.findIndex(x=>x.name===name);
  if(i<0)throw new Error(`Missing ${name}`);
  const cur=all[i],next=all[i+1];
  if(!next)throw new Error(`No next function after ${name}`);
  return {name,start:cur.start,line:lineOf(cur.start),next:next.name,nextStart:next.start,nextLine:lineOf(next.start),span:next.start-cur.start};
}
const rows=targets.map(nextDecl);
const financeNames=all.filter(x=>/finance/i.test(x.name)).map(x=>({name:x.name,line:lineOf(x.start)}));
const report=[
  '# Finance dependency analysis','',
  `- index.html bytes: ${Buffer.byteLength(src)}`,'',
  '## UI extraction candidates',
  ...rows.map(x=>`- \`${x.name}\`: line ${x.line} -> next \`${x.next}\` line ${x.nextLine}, source span ${x.span} bytes`),
  '', '## Finance-related functions in source order',
  ...financeNames.map(x=>`- \`${x.name}\`: line ${x.line}`),
  '', 'No production code is changed by this analyzer.'
].join('\n');
fs.mkdirSync('refactor',{recursive:true});
fs.writeFileSync('refactor/finance-analysis.md',report);
console.log(report);
