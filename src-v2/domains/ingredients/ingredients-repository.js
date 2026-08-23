export function createIngredientsRepository({ gateway }) {
  if (!gateway) throw new Error('gateway is required');

  async function list() {
    return gateway.selectOrg('ly_ingredients', '*', query => query.order?.('name', { ascending: true }) ?? query);
  }

  async function listPreparedItems() {
    return gateway.selectOrg('ly_prepared_items', '*', query => query.order?.('source_ingredient_id', { ascending: true }) ?? query);
  }

  async function save(ingredient, preparedItems = []) {
    if (!ingredient || typeof ingredient !== 'object') throw new TypeError('ingredient is required');
    if (!Array.isArray(preparedItems)) throw new TypeError('preparedItems must be an array');
    return gateway.rpc('ly_save_ingredient', {
      p_ingredient: ingredient,
      p_prepared_items: preparedItems
    });
  }

  return Object.freeze({ list, listPreparedItems, save });
}
