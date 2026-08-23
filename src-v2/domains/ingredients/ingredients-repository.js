export function createIngredientsRepository({ gateway }) {
  if (!gateway) throw new Error('gateway is required');

  async function list() {
    return gateway.selectOrg('ly_ingredients', '*', query => query.order?.('name', { ascending: true }) ?? query);
  }

  async function save(rpcPayload) {
    if (!rpcPayload || typeof rpcPayload !== 'object') throw new TypeError('rpcPayload is required');
    return gateway.rpc('ly_save_ingredient', rpcPayload);
  }

  return Object.freeze({ list, save });
}
