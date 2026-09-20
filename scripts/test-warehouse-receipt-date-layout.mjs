import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const tableUx=readFileSync(new URL('../ly-ui-table-ergonomics.js',import.meta.url),'utf8');
const writes=readFileSync(new URL('../ly-vibe-business-writes.js',import.meta.url),'utf8');
const api=readFileSync(new URL('./vibehost-business-mutation-api.mjs',import.meta.url),'utf8');
const snapshotApi=readFileSync(new URL('./vibehost-snapshot-api.mjs',import.meta.url),'utf8');
const section=(start,end)=>{
  const first=index.indexOf(start),last=index.indexOf(end,first+start.length);
  assert.ok(first>=0&&last>first,`Missing ${start}`);
  return index.slice(first,last);
};
const code=[
  section('function businessReceiptDateISO(', 'function receiptGeneralNoteFromMovement('),
  section('function movementImportDateISO(', 'function currentMonthISO('),
  section('function exportReceiptDateFromMovement(', 'function exportReceiptGeneralNoteFromMovement('),
  section('function stocktakeReceiptDateFromMovement(', 'function stocktakeReceiptGroupKey('),
  section('function lyFreshSynthMovements(', 'loadCloud=async function(')
].join('\n');
const context={};
vm.runInNewContext(code,context);
const selected='2026-09-13',created='2026-09-20T08:00:00.000Z';
const movements=context.lyFreshSynthMovements({
  imports:[{id:'import',warehouse_id:'warehouse',receipt_no:'PN-13',receipt_date:`${selected}T00:00:00.000Z`,created_at:created}],
  importItems:[{id:'line',receipt_id:'import',ingredient_id:'ingredient',quantity:3,unit_cost:2,total_cost:6,created_at:created}],
  exports:[],exportItems:[],stocktakes:[],stocktakeItems:[],transactions:[],suppliers:[]
});
assert.equal(movements.length,1);
assert.equal(context.receiptDateFromMovement(movements[0]),selected,'report must use the selected receipt date, not insertion time');
assert.equal(context.movementImportDateISO(movements[0]),selected,'day filter must use the selected receipt date');
assert.equal(context.receiptDateFromMovement({note:`Phiếu:PN-13 | Ngày nhập:${selected}T00:00:00.000Z`,created_at:created}),selected,'already-saved timestamp notes must be displayed on their business date');
assert.equal(context.exportReceiptDateFromMovement({note:`Ngày xuất:${selected}T00:00:00.000Z`}),selected);
assert.equal(context.stocktakeReceiptDateFromMovement({note:`Ngày kiểm kê:${selected}T00:00:00.000Z`}),selected);

const detail=section('<table class="warehouse-combined-detail-table">','${range.mode!==\'day\' && days.length?`');
assert.match(detail,/<colgroup>[\s\S]*width:190px[\s\S]*<\/colgroup>/,'receipt number must have a readable column');
assert.match(detail,/<th>STT<\/th>[\s\S]*<th>Ngày<\/th>[\s\S]*<th>Loại<\/th>[\s\S]*<th>Số phiếu<\/th>/,'detail table must own stable serial and receipt columns');
assert.match(tableUx,/reportDetail=t\.classList\?\.contains\('warehouse-combined-detail-table'\),wide=/,'detail table must scroll instead of crushing columns');
assert.match(tableUx,/referenceWidth=reportDetail\?1220:/,'detail table must retain a useful reference width');
assert.match(writes,/const receiptDate=String\(\$\('receiptDate'\)\?\.value\|\|''\)\.trim\(\)/,'import save must take the chosen date directly from its field');
assert.match(writes,/confirmedDate&&confirmedDate!==receiptDate/,'import save must detect a server-side date mismatch');
assert.match(api,/receipt_date:receiptDate/,'Vibe must persist the selected date instead of silently defaulting to today');
assert.match(api,/select receipt_date::text as receipt_date/,'Vibe must read back the stored date before confirming');
assert.match(snapshotApi,/ly_import_receipts:'receipt_date'/,'snapshot must preserve the import business date');
assert.match(snapshotApi,/quoteIdentifier\(dateColumn\)\}::text as/,'snapshot must serialize SQL dates without time zone conversion');
console.log('Warehouse receipt date and detail-table layout: PASS');
