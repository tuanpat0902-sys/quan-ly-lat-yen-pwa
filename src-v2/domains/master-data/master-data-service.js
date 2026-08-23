export function createMasterDataService({ repository, store, events }) {
  if (!repository || !store || !events) throw new Error('repository, store and events are required');

  async function refresh() {
    const [warehouses, suppliers] = await Promise.all([
      repository.listWarehouses(),
      repository.listSuppliers()
    ]);
    store.patch({ warehouses, suppliers }, { source: 'master-data:refresh' });
    events.emit('master-data:changed', { warehouses, suppliers });
    return { warehouses, suppliers };
  }

  async function saveWarehouse(warehouse, purchasedIngredientIds = []) {
    const row = await repository.saveWarehouse(warehouse, purchasedIngredientIds);
    await refresh();
    events.emit('warehouses:saved', row);
    return row;
  }

  async function saveSupplier(supplier) {
    const row = await repository.saveSupplier(supplier);
    await refresh();
    events.emit('suppliers:saved', row);
    return row;
  }

  async function ensureSupplierByName(name) {
    const row = await repository.ensureSupplierByName(name);
    await refresh();
    return row;
  }

  return Object.freeze({ refresh, saveWarehouse, saveSupplier, ensureSupplierByName });
}
