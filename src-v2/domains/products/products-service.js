export function createProductsService({ repository, store, events }) {
  if (!repository || !store || !events) throw new Error('repository, store and events are required');

  async function refresh() {
    const [products, recipeItems] = await Promise.all([
      repository.list(),
      repository.listRecipeItems()
    ]);
    store.patch({ products, recipeItems }, { source: 'products:refresh' });
    events.emit('products:changed', { products, recipeItems });
    return { products, recipeItems };
  }

  async function save(product, recipeItems = []) {
    const id = await repository.save(product, recipeItems);
    await refresh();
    events.emit('products:saved', { id });
    return id;
  }

  return Object.freeze({ refresh, save });
}
