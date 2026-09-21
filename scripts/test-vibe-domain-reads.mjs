import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [api,server,client]=await Promise.all([
  fs.readFile(new URL('./vibehost-domain-read-api.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('./vibehost-static-server.mjs',import.meta.url),'utf8'),
  fs.readFile(new URL('../ly-vibe-read-cache.js',import.meta.url),'utf8'),
]);

assert.match(api,/authenticatedVibeUser\(request\)/,'domain reads must authenticate the Vibe session');
assert.match(api,/begin isolation level repeatable read read only/,'each domain snapshot must be transactionally consistent');
assert.match(api,/Math\.min\(730,Math\.max\(30/,'recent-data window must remain bounded');
assert.match(api,/Math\.min\(50,Math\.max\(1/,'history pages must never exceed 50 rows');
assert.match(api,/\(sold_at,id\)<\(/,'sales history must use a stable composite cursor');
assert.match(api,/\(\$\{qi\(config\[1\]\)\},id\)<\(/,'other histories must use a stable composite cursor');
assert.match(api,/sale_id=any\(\$2::uuid\[\]\)/,'paged sales must include only their matching detail lines');
assert.match(api,/known===current[\s\S]*notModified:true/,'unchanged domains must return only a revision marker');
assert.match(server,/handleDomainReadApi\(request, response, pathname, requestUrl\)/,'same-origin server must expose domain and paged history reads');
assert.match(client,/const TABLE_DOMAIN=new Map/,'browser reads must route tables to their owning domains');
assert.match(client,/pending:new Map\(\),domains:new Map\(\)/,'browser must deduplicate each domain independently');
assert.doesNotMatch(client,/\/api\/v1\/snapshot\?/,'browser startup must not fetch all business tables');
console.log('Vibe bounded domain reads and stable pagination: PASS');
