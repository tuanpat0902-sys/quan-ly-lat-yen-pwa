import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const index=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const realtime=await fs.readFile(new URL('../ly-fresh-core-v2-realtime.js',import.meta.url),'utf8');
const start=index.indexOf('setupRealtime=function(){',index.indexOf('const LY_FRESH_TABLES='));
const end=index.indexOf('\n};',start);
assert.ok(start>0&&end>start,'Fresh compatibility setupRealtime owner must exist');
const compatibility=index.slice(start,end+3);

assert.match(compatibility,/__lyFreshCoreV2Realtime/,'Legacy entry point must delegate to the V2 Realtime owner');
assert.match(compatibility,/removeChannel\(window\.__lyFreshRealtime\)/,'Any pre-existing Legacy channel must be removed');
assert.doesNotMatch(compatibility,/\.channel\s*\(/,'Legacy entry point must not create a second Realtime channel');
assert.doesNotMatch(compatibility,/postgres_changes/,'Legacy entry point must not duplicate Postgres Changes subscriptions');
assert.doesNotMatch(compatibility,/loadCloud\s*\(/,'Realtime events must not trigger a full Legacy Cloud reload');
assert.match(realtime,/pendingDomains/,'Authoritative Realtime must batch refreshes by data domain');
assert.match(realtime,/SIGNAL_TABLE='ly_change_signals'/,'Authoritative Realtime must use the compact change-signal broker');
assert.doesNotMatch(realtime,/for\s*\(const \[table,domain\].*\.on\('postgres_changes'/s,'Authoritative Realtime must not subscribe to every business table');
assert.match(realtime,/HIDDEN_SUSPEND_MS/,'Hidden devices must release their Realtime subscription');
assert.doesNotMatch(realtime,/loadCloud\s*\(/,'Authoritative Realtime must not call the full Legacy loader');

console.log('Supabase egress + single Realtime owner guard: PASS');
