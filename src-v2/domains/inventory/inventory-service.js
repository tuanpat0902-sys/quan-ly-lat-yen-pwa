export function createInventoryService({ repository, store, events }) {
  if (!repository || !store || !events) throw new Error('repository, store and events are required');

  async function refresh() {
    const [balances, transactions] = await Promise.all([
      repository.listBalances(),
      repository.listTransactions()
    ]);
    const value = { balances, transactions };
    store.patch({ inventoryData: value }, { source: 'inventory:refresh' });
    events.emit('inventory:changed', value);
    return value;
  }

  return Object.freeze({ refresh });
}
