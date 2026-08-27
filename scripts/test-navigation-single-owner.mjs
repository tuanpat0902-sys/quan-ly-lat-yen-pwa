import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const owner=await fs.readFile(new URL('../ly-navigation-owner.js',import.meta.url),'utf8');
const security=await fs.readFile(new URL('../ly-menu-security.js',import.meta.url),'utf8');
const loader=await fs.readFile(new URL('../ly-module-loader.js',import.meta.url),'utf8');

assert.match(owner,/state\.baseShowTab\.call\(window,id,button\)/,'navigation owner must preserve legacy activePanelId through original showTab');
assert.match(owner,/reconcile\(id,button\)/,'navigation owner must reconcile nav and panel state');
assert.match(owner,/window\.showTab=activate/,'navigation owner must become the single showTab owner before security wrapping');
assert.doesNotMatch(security,/document\.addEventListener\('click'.*stopImmediatePropagation/s,'menu security must not install a competing global nav click interceptor');
assert.match(loader,/await load\('navigationOwner'\);[\s\S]*await load\('menuSecurity'\)/,'navigation owner must load before menu security');
console.log('Single-owner navigation invariant: PASS');
