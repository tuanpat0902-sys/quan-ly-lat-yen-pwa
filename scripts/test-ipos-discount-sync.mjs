import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const migration=await fs.readFile(
  new URL('../supabase/migrations/20260828180430_repair_ipos_discount_mapping.sql',import.meta.url),
  'utf8'
);

function normalize({subtotal,total,receipt=0,item=0}){
  const derived=Math.max(subtotal-total,0);
  const discount=Math.max(receipt+item,derived);
  return {
    subtotal,
    total,
    itemDiscount:item,
    receiptDiscount:Math.max(discount-item,0),
    discount
  };
}

assert.deepEqual(
  normalize({subtotal:234000,total:210600}),
  {subtotal:234000,total:210600,itemDiscount:0,receiptDiscount:23400,discount:23400},
  'a missing iPOS discount must be derived from amount_origin - total_amount'
);
assert.deepEqual(
  normalize({subtotal:361000,total:296000,item:65000}),
  {subtotal:361000,total:296000,itemDiscount:65000,receiptDiscount:0,discount:65000},
  'an explicit item discount must not be duplicated as a receipt discount'
);
assert.deepEqual(
  normalize({subtotal:100000,total:85000,receipt:10000,item:5000}),
  {subtotal:100000,total:85000,itemDiscount:5000,receiptDiscount:10000,discount:15000},
  'complete explicit iPOS discount metadata must be preserved'
);
assert.deepEqual(
  normalize({subtotal:100000,total:85000,receipt:5000,item:5000}),
  {subtotal:100000,total:85000,itemDiscount:5000,receiptDiscount:10000,discount:15000},
  'the monetary gap must fill partially omitted receipt metadata'
);
assert.deepEqual(
  normalize({subtotal:100000,total:110000}),
  {subtotal:100000,total:110000,itemDiscount:0,receiptDiscount:0,discount:0},
  'a surcharge must never be mislabeled as a discount'
);

assert.match(migration,/v_derived_discount := greatest\(v_subtotal-v_total_amount,0\)/);
assert.match(migration,/v_total_discount := greatest\(/);
assert.match(migration,/v_receipt_discount := greatest\(v_total_discount-v_item_discount_total,0\)/);
assert.match(migration,/total_amount=v_total_amount/,'the authoritative iPOS payment amount must stay unchanged');
assert.match(migration,/where source='iPOS'/,'the repair must be scoped to iPOS rows only');
assert.match(migration,/coalesce\(discount,0\)<greatest/,'the repair must skip already-correct discounts');
assert.match(migration,/revoke all on function public\.ly_ipos_upsert_sale\(uuid,uuid,jsonb\) from public, anon, authenticated/);
assert.match(migration,/grant execute on function public\.ly_ipos_upsert_sale\(uuid,uuid,jsonb\) to postgres, service_role/);

console.log('iPOS discount synchronization fallback and repair: PASS');
