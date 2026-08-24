import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const financeSource=await fs.readFile(new URL('../ly-finance.js',import.meta.url),'utf8');
const indexSource=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');

const elements={
  financeReportArea:{innerHTML:''},financeMode:{value:'month'},financeDayBox:{style:{}},
  financeMonthBox:{style:{}},financeYearBox:{style:{}},financeRangeBox:{style:{}},
  financeDay:{value:'2026-08-24'},financeMonth:{value:'2026-08'},financeYear:{value:'2026'},
  financeFrom:{value:'2026-08-01'},financeTo:{value:'2026-08-31'},financePeriodLabel:{textContent:''},
  financeYearBreakdownHost:{innerHTML:''}
};
const emptyMap={get(){return [];}};
const context={
  window:null,E:{finance:{innerHTML:''}},document:{getElementById:id=>elements[id]||null},
  $:id=>elements[id]||null,console,setTimeout:fn=>{fn();return 1;},Date,
  todayLocalISO:()=> '2026-08-24',currentMonthISO:()=> '2026-08',financeDefaultFromDate:()=> '2026-07-26',
  financeCurrentYear:()=>2026,esc:v=>String(v??''),money:v=>String(Number(v||0)),num:v=>String(Number(v||0)),
  warehouse:()=>({name:'Kho chính'}),financeRange(){const mode=elements.financeMode.value;return mode==='year'
    ?{mode,year:2026,start:'2026-01-01',end:'2026-12-31',label:'Năm 2026'}
    :{mode,start:'2026-08-01',end:'2026-08-31',label:'Tháng 08/2026'};},
  financeSalesInRange:()=>[],financeImportsInRange:()=>[],financeExportsInRange:()=>[],
  financeInventoryPeriod:()=>({opening:{netValue:0},closing:{netValue:0,deficitValue:0,negativeItems:0},importValue:0,exportValue:0,exportExpenseValue:0,exportInventoryOnlyValue:0}),
  financeSalaryCostInRange:()=>({total:0,byEmployee:[]}),financeCashflowInRange:()=>({income:0,expense:0,net:0,list:[],excludedInventoryPayments:[],excludedInventoryPaymentTotal:0}),
  financeStocktakeInRange:()=>({shortage:0,surplus:0,net:0,receipts:[]}),saleCogsValue:()=>0,
  getDataIndexes:()=>({saleItemsBySale:emptyMap,productById:emptyMap}),productUnitMap:()=>({}),productCost:()=>0,
  scheduleIdleWork:(_key,fn)=>fn(),drawFinanceTrend:()=>{},financeYearBreakdownHtml:year=>`<table data-year="${year}"></table>`,
  invalidateDerivedCaches:()=>{}
};
context.window=context;
vm.createContext(context);
vm.runInContext(financeSource,context,{filename:'ly-finance.js'});

context.renderFinanceData();
assert.match(elements.financeReportArea.innerHTML,/Tổng quan tài chính/,'monthly report must render without requiring day mode first');
assert.equal(context.window.__lyFinanceViewState.mode,'month','monthly selection must be remembered');

elements.financeMode.value='year';
context.renderFinanceData();
assert.match(elements.financeReportArea.innerHTML,/Tổng hợp 12 tháng/,'yearly report shell must render');
assert.match(elements.financeYearBreakdownHost.innerHTML,/data-year="2026"/,'yearly detail must load independently');
assert.equal(context.window.__lyFinanceViewState.mode,'year','year selection must survive later panel renders');

assert.match(indexSource,/core\?\.domains\?\.cashflow/,'cashflow writes must use the Fresh Core V2 domain');
assert.doesNotMatch(indexSource,/\.from\(['"]ly_cashflow_entries['"]\)\s*\.upsert/,'cashflow save must not recurse through the legacy Supabase wrapper');
assert.doesNotMatch(indexSource,/\.from\(['"]ly_cashflow_entries['"]\)\s*\.delete/,'cashflow delete must not recurse through the legacy Supabase wrapper');

console.log('Finance and cashflow stability: PASS');
