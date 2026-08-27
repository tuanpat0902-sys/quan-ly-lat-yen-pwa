import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const src=await fs.readFile(new URL('../ly-menu-security.js',import.meta.url),'utf8');

assert.match(src,/function authorize\(id,btn,proceed\)/,'menu security must expose router authorization');
assert.doesNotMatch(src,/window\.showTab=st\.guard/,'menu security must never own or replace showTab');
assert.doesNotMatch(src,/document\.addEventListener\('click'.*stopImmediatePropagation/s,'menu security must not install a competing global navigation click interceptor');
assert.match(src,/open\(p,b,proceed\)/,'protected navigation must preserve the router continuation');
assert.match(src,/typeof p\.proceed==='function'/,'successful password verification must continue the original router navigation');
console.log('Menu security router authorization: PASS');
