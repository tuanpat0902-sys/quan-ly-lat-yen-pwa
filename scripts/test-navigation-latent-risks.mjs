import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const security=await fs.readFile(new URL('../ly-menu-security.js',import.meta.url),'utf8');
const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');

assert.match(html,/visibilitychange'[\s\S]*flushDeferredRenders\(\)/,'deferred panel renders must flush when the page becomes visible');
assert.match(html,/pageshow',flushDeferredRenders/,'deferred panel renders must flush on bfcache restore');
assert.match(html,/focus',flushDeferredRenders/,'deferred panel renders must flush when the window regains focus');
assert.match(security,/statusPromise/,'menu security status checks must be serialized');
assert.match(security,/if\(st\.statusPromise\)return st\.statusPromise/,'concurrent menu authorization must share one status request');
assert.doesNotMatch(security,/window\.showTab=st\.guard/,'menu security must never replace the V3 router');
assert.doesNotMatch(loader,/document\.addEventListener\('click',event=>preparePanel/,'panel preparation must not run twice for one click');
console.log('Navigation latent-risk audit: PASS');
