import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {FINANCE_CASHFLOW_CONTRACT as CONTRACT,FINANCE_CASHFLOW_MIGRATION_GUARD as GUARD} from '../src-v3/domains/finance-cashflow/finance-cashflow-contract.js';

const baseline=JSON.parse(await fs.readFile(new URL('../src-v3/domains/finance-cashflow/production-baseline.json',import.meta.url),'utf8'));
const repository=await fs.readFile(new URL('../src-v2/domains/cashflow/cashflow-repository.js',import.meta.url),'utf8');
const service=await fs.readFile(new URL('../src-v2/domains/cashflow/cashflow-service.js',import.meta.url),'utf8');
const financeUi=await fs.readFile(new URL('../ly-finance.js',import.meta.url),'utf8');
const cashflowUi=await fs.readFile(new URL('../ly-cashflow.js',import.meta.url),'utf8');

assert.equal(CONTRACT.status,'source-of-truth-audited-empty-cashflow-dependency-locked');
assert.equal(CONTRACT.currentAuthority,'v2');
assert.equal(CONTRACT.productionActivation,false);
assert.equal(CONTRACT.dualWrite,false);
assert.equal(CONTRACT.cloudReads,0);
assert.equal(CONTRACT.cloudWrites,0);
assert.equal(CONTRACT.cashflow.table,'ly_cashflow_entries');
assert.equal(CONTRACT.cashflow.productionRows,0);
assert.equal(CONTRACT.cashflow.rlsVerified,true);
assert.equal(CONTRACT.finance.calculationAuthority,'legacy-core');
assert.equal(CONTRACT.finance.persistenceTableDedicated,false);
assert.deepEqual(CONTRACT.finance.aggregationInputs,['sales','cogs','salary','cashflow','stocktake','inventory']);
assert.equal(CONTRACT.repositoryImplemented,false);
assert.equal(CONTRACT.serviceImplemented,false);
assert.equal(CONTRACT.shadowImplemented,false);

assert.equal(baseline.cashflow.rows,0);
assert.equal(baseline.cashflow.rls,true);
assert.equal(baseline.cashflow.orgScoped,true);
assert.equal(baseline.cashflow.warehouseScoped,true);
assert.equal(baseline.cashflow.entryTypeRestricted,true);
assert.equal(baseline.cashflow.positiveAmountRequired,true);
assert.equal(baseline.runtime.financeFormulaChanged,false);
assert.equal(baseline.runtime.cashflowWritePathChanged,false);

assert.match(repository,/selectOrg\('ly_cashflow_entries'/);
assert.match(repository,/insertOrg\('ly_cashflow_entries'/);
assert.match(repository,/updateOrg\('ly_cashflow_entries'/);
assert.match(repository,/deleteOrg\('ly_cashflow_entries'/);
assert.match(service,/store\.patch\(\{ cashflowEntries: entries \}/);
assert.match(financeUi,/Finance calculations remain in Legacy core/);
assert.match(financeUi,/financeCashflowInRange/);
assert.match(financeUi,/financeStocktakeInRange/);
assert.match(financeUi,/financeInventoryPeriod/);
assert.match(cashflowUi,/Cashflow persistence\/business rules remain in Legacy core/);

assert.deepEqual(GUARD.requireDependencies,['V3-5','V3-6']);
assert.equal(GUARD.requireLegacyFinanceFormulaParity,true);
assert.equal(GUARD.allowFormulaChanges,false);
assert.equal(GUARD.allowCashflowWrites,false);
assert.equal(GUARD.allowDualWrite,false);
assert.equal(GUARD.allowAutoPromotion,false);
assert.equal(GUARD.currentAuthority,'v2');

console.log('Fresh Core V3-7 finance/cashflow source-of-truth audit: PASS');
