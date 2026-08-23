export function createIngredientsService({ repository, store, events }) {
  if (!repository || !store || !events) throw new Error('repository, store and events are required');

  async function refresh(meta = {}) {
    const rows = await repository.list();
    store.patch({ ingredients: rows }, { source: 'ingredients:refresh', ...meta });
    events.emit('ingredients:changed', rows);
    return rows;
  }

  async function save(ingredient, preparedItems = []) {
    const id = await repository.save(ingredient, preparedItems);
    await refresh({ reason: 'save' });
    events.emit('ingredients:saved', { id });
    return id;
  }

  return Object.freeze({ refresh, save });
}
