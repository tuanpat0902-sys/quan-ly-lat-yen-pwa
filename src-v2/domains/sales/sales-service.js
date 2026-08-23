export function createSalesService({ repository, store, events }) {
  if (!repository || !store || !events) throw new Error('repository, store and events are required');

  async function refresh() {
    const [sales, items] = await Promise.all([repository.listSales(), repository.listItems()]);
    const value = { sales, items };
    store.patch({ salesData: value }, { source: 'sales:refresh' });
    events.emit('sales:changed', value);
    return value;
  }

  async function save(header, saleItems = [], stockLines = []) {
    const id = await repository.save(header, saleItems, stockLines);
    await refresh();
    events.emit('sales:saved', { id });
    return id;
  }

  async function remove(id) {
    const result = await repository.remove(id);
    await refresh();
    events.emit('sales:removed', { id });
    return result;
  }

  return Object.freeze({ refresh, save, remove });
}
