import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const indexPath='index.html';
let src=fs.readFileSync(indexPath,'utf8');
if(!/\bfunction\s+renderSettings\s*\(/.test(src)){
  console.log('renderSettings already extracted');
  process.exit(0);
}
const start=src.indexOf('function renderSettings(');
const end=src.indexOf('function migrateV2ToCloud(',start);
if(start<0||end<0||end<=start)throw new Error('Settings extraction markers not found');
const original=src.slice(start,end).trim();
const wrapped=`/* Lát Yên — Settings UI V1\n   Extracted from Legacy index.html. Migration/auth/sync functions remain in Legacy core. */\n(()=>{\n  'use strict';\n  if(window.__lySettingsUIModule)return;\n  window.__lySettingsUIModule={version:'2026.08.23.1'};\n\n${original.split('\n').map(x=>'  '+x).join('\n')}\n\n  window.__lySettingsUIModule.renderSettings=renderSettings;\n})();\n`;
fs.writeFileSync('ly-settings-ui.js',wrapped);
const check=spawnSync(process.execPath,['--check','ly-settings-ui.js'],{encoding:'utf8'});
if(check.status!==0)throw new Error(check.stderr||'ly-settings-ui.js syntax failed');
const before=Buffer.byteLength(src);
src=src.slice(0,start)+'/* renderSettings extracted to ly-settings-ui.js */\n\n'+src.slice(end);
fs.writeFileSync(indexPath,src);
const after=Buffer.byteLength(src);
fs.mkdirSync('refactor',{recursive:true});
fs.writeFileSync('refactor/settings-ui-extraction-result.md',`# Settings UI extraction result\n\n- index.html before: ${before} bytes\n- index.html after: ${after} bytes\n- index.html reduction: ${before-after} bytes\n- extracted source span: ${Buffer.byteLength(original)} bytes\n- module file: ly-settings-ui.js (${Buffer.byteLength(wrapped)} bytes)\n\nMigration/auth/sync functions remain in Legacy core.\nModule syntax check: PASS.\n`);
console.log(`Settings UI extracted: ${before-after} bytes removed from index.html`);
