import fs from 'node:fs';
const src=fs.readFileSync('index.html','utf8');
const decl=/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g;
const all=[];let m;
while((m=decl.exec(src)))all.push({name:m[1],start:m.index});
function lineOf(pos){return src.slice(0,pos).split('\n').length;}
const rows=[];
for(let i=0;i<all.length-1;i++){
  const cur=all[i],next=all[i+1];
  if(/^render[A-Z]/.test(cur.name))rows.push({name:cur.name,line:lineOf(cur.start),next:next.name,nextLine:lineOf(next.start),span:next.start-cur.start});
}
rows.sort((a,b)=>b.span-a.span);
const out=['# Remaining render candidates','',`- index.html bytes: ${Buffer.byteLength(src)}`,'','## Largest function spans',...rows.slice(0,40).map(x=>`- \`${x.name}\`: line ${x.line} -> \`${x.next}\` line ${x.nextLine}, ${x.span} bytes`),'','Analyzer only; no production code changed.'].join('\n');
fs.mkdirSync('refactor',{recursive:true});
fs.writeFileSync('refactor/next-ui-analysis.md',out);
console.log(out);
