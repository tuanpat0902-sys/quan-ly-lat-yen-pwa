import { createIngredientsRepository } from './ingredients/ingredients-repository.js';
import { createIngredientsService } from './ingredients/ingredients-service.js';
import { createProductsRepository } from './products/products-repository.js';
import { createProductsService } from './products/products-service.js';
import { createDocumentRepository, createDocumentService } from './documents/document-repository.js';
import { createSalesRepository } from './sales/sales-repository.js';
import { createSalesService } from './sales/sales-service.js';
import { createCashflowRepository } from './cashflow/cashflow-repository.js';
import { createCashflowService } from './cashflow/cashflow-service.js';

export function createDomains({ gateway, store, events }) {
  const ingredientsRepository = createIngredientsRepository({ gateway });
  const productsRepository = createProductsRepository({ gateway });
  const importsRepository = createDocumentRepository({
    gateway,
    receiptTable: 'ly_import_receipts',
    itemTable: 'ly_import_items',
    rpcName: 'ly_save_import',
    deleteType: 'import'
  });
  const exportsRepository = createDocumentRepository({
    gateway,
    receiptTable: 'ly_export_receipts',
    itemTable: 'ly_export_items',
    rpcName: 'ly_save_export',
    deleteType: 'export'
  });
  const stocktakeRepository = createDocumentRepository({
    gateway,
    receiptTable: 'ly_stocktake_receipts',
    itemTable: 'ly_stocktake_items',
    rpcName: 'ly_save_stocktake',
    deleteType: 'stocktake'
  });
  const salesRepository = createSalesRepository({ gateway });
  const cashflowRepository = createCashflowRepository({ gateway });

  return Object.freeze({
    ingredients: createIngredientsService({ repository: ingredientsRepository, store, events }),
    products: createProductsService({ repository: productsRepository, store, events }),
    imports: createDocumentService({ repository: importsRepository, store, events, stateKey: 'importsData', eventPrefix: 'imports' }),
    exports: createDocumentService({ repository: exportsRepository, store, events, stateKey: 'exportsData', eventPrefix: 'exports' }),
    stocktake: createDocumentService({ repository: stocktakeRepository, store, events, stateKey: 'stocktakeData', eventPrefix: 'stocktake' }),
    sales: createSalesService({ repository: salesRepository, store, events }),
    cashflow: createCashflowService({ repository: cashflowRepository, store, events })
  });
}
