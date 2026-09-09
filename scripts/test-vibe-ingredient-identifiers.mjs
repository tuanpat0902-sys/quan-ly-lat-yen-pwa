import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('./vibehost-business-mutation-api.mjs',import.meta.url),'utf8');
const context=vm.createContext({schema:'test',qi:value=>'"'+value+'"',String});
vm.runInContext(source.slice(source.indexOf('function uuid('),source.indexOf('function number('))+
  source.slice(source.indexOf('async function resolveRecipeIngredient('),source.indexOf('async function ensureEmployees(')),context);
const historical='12345678-abcd-0abc-0abc-123456789abc';
assert.equal(context.uuid(historical),historical,'PostgreSQL identifiers must not be discarded because version bits differ');
assert.equal(context.uuid('  '+historical.toUpperCase()+'  '),historical);
assert.equal(context.uuid('not-an-id'),'');
let calls=0;
const directClient={async query(sql,args){calls++;assert.equal(args[0],historical);return {rowCount:1};}};
assert.equal(await context.resolveRecipeIngredient(directClient,'org',{ingredient_id:historical,ingredient_name:'Hạt sen'}),historical);
assert.equal(calls,1,'an existing identifier requires only one lookup');
const missingClient={async query(){calls++;return {rowCount:0};}};
calls=0;
assert.equal(await context.resolveRecipeIngredient(missingClient,'org',{ingredient_id:historical,ingredient_name:'Hạt sen'}),'');
assert.equal(calls,1,'a missing canonical identifier must not silently map to a different ingredient');
assert.equal(await context.resolveRecipeIngredient({async query(){return {rows:[{id:historical}]};}},'org',{ingredient_id:'old-code',ingredient_name:'Hạt sen'}),historical);
assert.equal(await context.resolveRecipeIngredient({async query(){return {rows:[{id:historical},{id:'another'}]};}},'org',{ingredient_id:'old-code',ingredient_name:'Hạt sen'}),'','ambiguous names must not silently select an ingredient');
console.log('Vibe ingredient identity compatibility and fail-closed resolution: PASS');
