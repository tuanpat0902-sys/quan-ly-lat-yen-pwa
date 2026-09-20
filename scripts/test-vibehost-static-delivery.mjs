import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { get } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const child=spawn(process.execPath,['scripts/vibehost-static-server.mjs'],{cwd:root,env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
let stderr='';
child.stderr.on('data',chunk=>{stderr+=chunk.toString();});
function rawResponse(url,encoding){return new Promise((resolveResponse,reject)=>{get(url,{headers:{'Accept-Encoding':encoding}},response=>{const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>resolveResponse({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks)}));response.on('error',reject);}).on('error',reject);});}

try{
  const port=await new Promise((resolvePort,reject)=>{
    let stdout='';
    const timer=setTimeout(()=>reject(new Error(`Static server did not start: ${stderr.slice(0,300)}`)),15000);
    child.stdout.on('data',chunk=>{stdout+=chunk.toString();const match=/Static PWA server listening on http:\/\/127\.0\.0\.1:(\d+)/.exec(stdout);if(match){clearTimeout(timer);resolvePort(Number(match[1]));}});
    child.once('exit',code=>{clearTimeout(timer);reject(new Error(`Static server exited ${code}: ${stderr.slice(0,300)}`));});
  });
  const url=`http://127.0.0.1:${port}/`;
  const original=await readFile(resolve(root,'index.html'));
  const brotli=await rawResponse(url,'br');
  assert.equal(brotli.status,200);
  assert.equal(brotli.headers['content-encoding'],'br');
  assert.equal(brotli.headers.vary,'Accept-Encoding');
  assert.ok(Number(brotli.headers['content-length'])<original.length/2,'HTML transfer should be less than half of its original size');
  assert.deepEqual(brotliDecompressSync(brotli.body),original);
  const js=await readFile(resolve(root,'ly-module-loader.js'));
  const gzip=await rawResponse(`${url}ly-module-loader.js?v=static-test`,'gzip');
  assert.equal(gzip.headers['content-encoding'],'gzip');
  assert.match(gzip.headers['cache-control'],/immutable/);
  assert.deepEqual(gunzipSync(gzip.body),js);
  const identity=await rawResponse(url,'identity');
  assert.equal(identity.headers['content-encoding'],undefined);
  assert.equal(Number(identity.headers['content-length']),original.length);
  const denied=await rawResponse(url,'br;q=0, gzip;q=0');
  assert.equal(denied.headers['content-encoding'],undefined);
  console.log('Vibe static delivery: Brotli HTML, gzip versioned JS, identity fallback and immutable cache PASS');
}finally{
  child.kill();
}
