import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const SKIP=new Set(['.git','node_modules','artifacts']);
const exts=new Set(['.js','.mjs','.html','.sql','.json','.yml','.yaml','.css','.webmanifest']);
const files=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(SKIP.has(ent.name))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(exts.has(path.extname(ent.name)))files.push(p);}}
walk(ROOT);

const textFiles=files.map(p=>({path:path.relative(ROOT,p).replaceAll('\\','/'),text:fs.readFileSync(p,'utf8')}));
const src=textFiles.filter(f=>/\.(js|mjs|html)$/.test(f.path));
const sql=textFiles.filter(f=>f.path.endsWith('.sql'));
const count=(s,re)=>(s.match(re)||[]).length;
const totalBytes=textFiles.reduce((n,f)=>n+Buffer.byteLength(f.text),0);
const totalLines=textFiles.reduce((n,f)=>n+f.text.split(/\r?\n/).length,0);
const jsBytes=src.reduce((n,f)=>n+Buffer.byteLength(f.text),0);
const metrics={
  files:textFiles.length,totalBytes,totalLines,jsHtmlBytes:jsBytes,sqlFiles:sql.length,
  functions:src.reduce((n,f)=>n+count(f.text,/\bfunction\s+[A-Za-z_$][\w$]*\s*\(|\b(?:async\s+)?[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g),0),
  globals:src.reduce((n,f)=>n+count(f.text,/^(?:let|var|const)\s+[A-Za-z_$][\w$]*/gm),0),
  listeners:src.reduce((n,f)=>n+count(f.text,/\.addEventListener\s*\(/g),0),
  intervals:src.reduce((n,f)=>n+count(f.text,/\bsetInterval\s*\(/g),0),
  timeouts:src.reduce((n,f)=>n+count(f.text,/\bsetTimeout\s*\(/g),0),
  observers:src.reduce((n,f)=>n+count(f.text,/new\s+MutationObserver\s*\(/g),0),
  innerHTML:src.reduce((n,f)=>n+count(f.text,/\.innerHTML\s*=/g),0),
  supabaseFrom:src.reduce((n,f)=>n+count(f.text,/\.from\s*\(/g),0),
  supabaseRpc:src.reduce((n,f)=>n+count(f.text,/\.rpc\s*\(/g),0),
  localStorage:src.reduce((n,f)=>n+count(f.text,/\blocalStorage\b/g),0),
  compatibilityMarkers:src.reduce((n,f)=>n+count(f.text,/\b(?:v1\d\d|v2\d\d|legacy|compat)\b/gi),0),
  guards:src.reduce((n,f)=>n+count(f.text,/window\.__ly[A-Za-z0-9_$]+/g),0)
};

const largest=textFiles.map(f=>({path:f.path,bytes:Buffer.byteLength(f.text),lines:f.text.split(/\r?\n/).length})).sort((a,b)=>b.bytes-a.bytes).slice(0,20);
const legacyIndex=src.find(f=>f.path==='index.html');
const indexMetrics=legacyIndex?{bytes:Buffer.byteLength(legacyIndex.text),lines:legacyIndex.text.split(/\r?\n/).length,functions:count(legacyIndex.text,/\bfunction\s+[A-Za-z_$][\w$]*\s*\(/g),globals:count(legacyIndex.text,/^(?:let|var|const)\s+[A-Za-z_$][\w$]*/gm),supabaseFrom:count(legacyIndex.text,/\.from\s*\(/g),rpc:count(legacyIndex.text,/\.rpc\s*\(/g),innerHTML:count(legacyIndex.text,/\.innerHTML\s*=/g),listeners:count(legacyIndex.text,/\.addEventListener\s*\(/g)}:null;

const risk=[];
if(indexMetrics?.bytes>1_000_000)risk.push(['critical','Monolithic index.html exceeds 1 MB']);
if((indexMetrics?.functions||0)>150)risk.push(['high','Large number of functions remain resident in index.html']);
if((indexMetrics?.globals||0)>150)risk.push(['high','Large mutable/global surface in index.html']);
if(metrics.supabaseFrom>80)risk.push(['high','Supabase access is highly distributed across runtime']);
if(metrics.innerHTML>120)risk.push(['medium','High direct DOM replacement surface']);
if(metrics.compatibilityMarkers>150)risk.push(['high','Large compatibility/versioned legacy surface']);
if(metrics.listeners>100)risk.push(['medium','Large event-listener surface']);

let rewriteScore=0;
for(const [sev] of risk)rewriteScore+=sev==='critical'?4:sev==='high'?3:sev==='medium'?2:1;
const recommendation=rewriteScore>=10?'STRANGLER_REWRITE':rewriteScore>=6?'AGGRESSIVE_MODULAR_REFACTOR':'CONTINUE_INCREMENTAL_REFACTOR';

const report={generatedAt:new Date().toISOString(),metrics,indexMetrics,largest,risk,rewriteScore,recommendation};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/full-code-audit.json',JSON.stringify(report,null,2));
const md=[
'# Full Code Audit V3','',`Generated: ${report.generatedAt}`,'',`## Recommendation: ${recommendation}`,`Rewrite score: ${rewriteScore}`,'','## Core metrics','',...Object.entries(metrics).map(([k,v])=>`- ${k}: ${v}`),'','## index.html','',...Object.entries(indexMetrics||{}).map(([k,v])=>`- ${k}: ${v}`),'','## Risks','',...risk.map(([s,m])=>`- **${s.toUpperCase()}**: ${m}`),'','## Largest files','',...largest.map(x=>`- ${x.path}: ${x.bytes} bytes / ${x.lines} lines`),''].join('\n');
fs.writeFileSync('artifacts/full-code-audit.md',md);
console.log(md);
