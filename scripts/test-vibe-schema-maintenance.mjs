import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('./vibehost-schema-maintenance.mjs',import.meta.url),'utf8');
const start=fs.readFileSync(new URL('./vibehost-start.mjs',import.meta.url),'utf8');
for(const fragment of ['ly_runtime_migrations','pg_advisory_xact_lock','ly_idx_sales_org_wh_sold','ly_idx_stock_tx_org_wh_created','ly_idx_activity_org_id','create sequence if not exists','pg_indexes','actor_email','add column if not exists updated_at','entered_quantity','entered_unit','conversion_ratio','inventoryRepairs'])assert.ok(source.includes(fragment),`missing schema safeguard: ${fragment}`);
assert.match(source,/i\.quantity>0 and l\.balance<0 and l\.has_sale_deduction and not l\.has_positive_source/,'startup maintenance must repair impossible positive inventory before serving traffic');
assert.match(source,/if\(!applied\)[\s\S]*insert into .*ly_runtime_migrations/,'maintenance must be idempotent and versioned');
assert.match(start,/runVibeSchemaMaintenance\(\)/,'server must apply Vibe runtime schema maintenance before serving traffic');
assert.match(start,/maintenance failed[\s\S]*throw error/,'server must fail closed when required schema maintenance fails');
console.log('Vibe versioned schema maintenance and production indexes: PASS');
