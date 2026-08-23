import fs from 'node:fs';
const s=fs.readFileSync('index.html','utf8');
const needle='ly_save_ingredient';
let at=-1,count=0;
while((at=s.indexOf(needle,at+1))>=0){
  count++;
  const before=s.slice(0,at);
  const matches=[...before.matchAll(/(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/g)];
  const fn=matches.at(-1);
  const start=Math.max(0,(fn?.index??at)-300);
  const end=Math.min(s.length,at+1800);
  console.log(`\n=== occurrence ${count} at ${at}; nearest function=${fn?.[1]||'<none>'} functionAt=${fn?.index??-1} ===`);
  console.log(s.slice(start,end));
}
console.log(`\nTOTAL ly_save_ingredient occurrences: ${count}`);
for(const key of ['saveIngredient','renderIngredients','loadCloud','preparedItems','ly_ingredients']){
  const hits=(s.match(new RegExp(key,'g'))||[]).length;
  console.log(`${key}: ${hits}`);
}
