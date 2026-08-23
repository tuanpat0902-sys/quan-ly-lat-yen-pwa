export function createIngredientsService({ repository, store, events }) {
  if (!repository || !store || !events) throw new Error('repository, store and events are required');

  async function refresh(meta = {}) {
    const [rows, preparedItems] = await Promise.all([
      repository.list(),
      repository.listPreparedItems()
    ]);
    store.patch({ ingredients: rows, preparedItems }, { source: 'ingredients:refresh', ...meta });
    events.emit('ingredients:changed', { ingredients: rows, preparedItems });
    return { ingredients: rows, preparedItems };
  }

  async function save(ingredient, preparedItems = []) {
    const id = await repository.save(ingredient, preparedItems);
    await refresh({ reason: 'save' });
    events.emit('ingredients:saved', { id });
    return id;
  }

  async function remove(id) {
    const result = await repository.remove(id);
    await refresh({ reason: 'remove' });
    events.emit('ingredients:removed', { id });
    return result;
  }

  return Object.freeze({ refresh, save, remove });
}
