import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const src=await fs.readFile(new URL('../ly-menu-security.js',import.meta.url),'utf8');

assert.match(src,/function captureBase\(\)/,'menu security must capture showTab when it becomes available');
assert.match(src,/function navigateBase\(/,'menu security must have a safe base navigation fallback');
assert.match(src,/function navigateWhenReady\(/,'navigation must queue until showTab exists');
assert.match(src,/function protectedWhenReady\(/,'protected navigation must preserve password checks while waiting for showTab');
assert.doesNotMatch(src,/st\.baseShowTab\?\.call\(window,p,b\)/,'protected click must not silently no-op when base showTab is missing');
assert.match(src,/if\(!st\.baseShowTab\)\{guard\(\);protectedWhenReady\(/,'protected click must recover without bypassing password protection');
console.log('Menu security early-navigation recovery: PASS');
