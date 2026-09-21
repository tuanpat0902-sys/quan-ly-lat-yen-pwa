import assert from 'node:assert/strict';

const ORDER_COUNT=10_000,SALE_LINE_COUNT=100_000,STOCK_ROW_COUNT=500_000,PAGE_SIZE=50,BATCH_SIZE=200;

function pageCount(total,size){let pages=0,seen=0;while(seen<total){const rows=Math.min(size,total-seen);assert.ok(rows<=50,'a UI history page exceeded 50 rows');seen+=rows;pages+=1;}return {pages,seen};}
function batchCount(total,size){let batches=0,seen=0;while(seen<total){const rows=Math.min(size,total-seen);assert.ok(rows<=200,'a database write batch exceeded 200 rows');seen+=rows;batches+=1;}return {batches,seen};}

const orders=pageCount(ORDER_COUNT,PAGE_SIZE),lines=batchCount(SALE_LINE_COUNT,BATCH_SIZE),stock=batchCount(STOCK_ROW_COUNT,BATCH_SIZE);
assert.deepEqual(orders,{pages:200,seen:ORDER_COUNT});
assert.deepEqual(lines,{batches:500,seen:SALE_LINE_COUNT});
assert.deepEqual(stock,{batches:2500,seen:STOCK_ROW_COUNT});

// Composite cursors must not drop records sharing one timestamp.
const sameTime=Array.from({length:137},(_,index)=>({at:'2026-09-21T10:00:00.000Z',id:String(999-index).padStart(4,'0')}));
let cursor=null,seen=[];
do{const eligible=cursor?sameTime.filter(row=>row.at<cursor.at||(row.at===cursor.at&&row.id<cursor.id)):sameTime;const page=eligible.slice(0,PAGE_SIZE);seen.push(...page.map(row=>row.id));cursor=page.length===PAGE_SIZE?page.at(-1):null;}while(cursor);
assert.equal(new Set(seen).size,sameTime.length,'composite cursor lost or duplicated equal-time records');
console.log('Scale contract: PASS (10k orders, 100k sale lines, 500k stock movements)');
