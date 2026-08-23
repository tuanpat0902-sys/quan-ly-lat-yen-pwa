export function createProductsRepository({ gateway }) {
  if (!gateway) throw new Error('gateway is required');

  async function list() {
    return gateway.selectOrg('ly_products', '*', query => query.order?.('name', { ascending: true }) ?? query);
  }

  async function listRecipeItems() {
    return gateway.selectOrg('ly_recipe_items');
  }

  async function save(product, recipeItems = []) {
    if (!product || typeof product !== 'object') throw new TypeError('product is required');
    if (!Array.isArray(recipeItems)) throw new TypeError('recipeItems must be an array');
    return gateway.rpc('ly_save_product', {
      p_product: product,
      p_recipe_items: recipeItems
    });
  }

  async function remove(id) {
    if (!id) throw new TypeError('id is required');
    const rows = await gateway.deleteOrg('ly_products', query => query.eq('id', id));
    return rows[0] ?? null;
  }

  return Object.freeze({ list, listRecipeItems, save, remove });
}
