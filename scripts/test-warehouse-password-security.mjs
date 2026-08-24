import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const migration=await fs.readFile(new URL('../supabase/migrations/20260824182000_add_warehouse_password_protection.sql',import.meta.url),'utf8');
const ux=await fs.readFile(new URL('../ly-warehouse-delete-ux.js',import.meta.url),'utf8');

for(const expected of [
  'ly_private.ly_warehouse_passwords',
  'enable row level security',
  'idx_ly_warehouse_passwords_org_id',
  'security definer',
  "set search_path = ''",
  "extensions.crypt(p_new_password, extensions.gen_salt('bf', 10))",
  'ly_warehouse_password_status',
  'ly_save_warehouse_secure',
  'ly_delete_warehouse_secure',
  'revoke all on table ly_private.ly_warehouse_passwords from public, anon, authenticated',
  'grant execute on function public.ly_delete_warehouse_secure(uuid, text) to authenticated'
])assert.ok(migration.includes(expected),`Missing warehouse security contract: ${expected}`);

for(const table of ['ly_import_receipts','ly_export_receipts','ly_stocktake_receipts','ly_sales','ly_warehouses']){
  assert.ok(migration.includes(`delete from public.${table}`),`Transactional delete must cover ${table}`);
}
assert.ok(migration.includes('Không thể xóa kho cuối cùng.'),'The last warehouse must remain protected');
assert.ok(!/return[\s\S]{0,100}password_hash/.test(migration),'Password hashes must never be returned');

for(const expected of [
  "client.rpc('ly_warehouse_password_status'",
  "client.rpc('ly_save_warehouse_secure'",
  "client.rpc('ly_delete_warehouse_secure'",
  "mode='remove'",
  "mode='set'",
  'Nhập chính xác tên kho để xác nhận',
  'Toàn bộ giao dịch, tồn kho, sản phẩm, phiếu nhập/xuất/kiểm kê'
])assert.ok(ux.includes(expected),`Missing warehouse UX contract: ${expected}`);

assert.ok(!ux.includes("from('ly_warehouses').delete"),'Browser must not directly delete warehouses');
assert.ok(!/localStorage[^\n]*(password|mật khẩu)/i.test(ux),'Warehouse passwords must not be stored locally');
console.log('Warehouse password and transactional deletion security: PASS');
