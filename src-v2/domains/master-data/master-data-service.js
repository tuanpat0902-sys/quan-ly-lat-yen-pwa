export function createMasterDataService({ repository, store, events }) {
  if (!repository || !store || !events) throw new Error('repository, store and events are required');

  async function refresh() {
    const [warehouses, suppliers] = await Promise.all([repository.listWarehouses(), repository.listSuppliers()]);
    store.patch({ warehouses, suppliers }, { source: 'master-data:refresh' });
    events.emit('master-data:changed', { warehouses, suppliers });
    return { warehouses, suppliers };
  }

  async function saveWarehouse(warehouse) {
    const row = await repository.saveWarehouse(warehouse);
    await refresh();
    events.emit('warehouses:saved', row);
    return row;
  }

  async function removeWarehouse(id) {
    const row = await repository.removeWarehouse(id);
    await refresh();
    events.emit('warehouses:removed', { id });
    return row;
  }

  async function initializeInventory(rows) {
    const result = await repository.initializeInventory(rows);
    events.emit('inventory:initialized', { count: Array.isArray(rows) ? rows.length : 1 });
    return result;
  }

  async function saveSupplier(supplier) {
    const row = await repository.saveSupplier(supplier);
    await refresh();
    events.emit('suppliers:saved', row);
    return row;
  }

  return Object.freeze({ refresh, saveWarehouse, removeWarehouse, initializeInventory, saveSupplier });
}
