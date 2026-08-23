export function createCashflowService({ repository, store, events }) {
  if (!repository || !store || !events) throw new Error('repository, store and events are required');

  async function refresh() {
    const entries = await repository.list();
    store.patch({ cashflowEntries: entries }, { source: 'cashflow:refresh' });
    events.emit('cashflow:changed', entries);
    return entries;
  }

  async function create(entry) {
    const row = await repository.create(entry);
    await refresh();
    events.emit('cashflow:created', row);
    return row;
  }

  async function update(id, patch) {
    const row = await repository.update(id, patch);
    await refresh();
    events.emit('cashflow:updated', row);
    return row;
  }

  async function remove(id) {
    const row = await repository.remove(id);
    await refresh();
    events.emit('cashflow:removed', row);
    return row;
  }

  return Object.freeze({ refresh, create, update, remove });
}
