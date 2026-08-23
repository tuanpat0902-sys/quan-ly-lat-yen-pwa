export function createDocumentRepository({ gateway, receiptTable, itemTable, rpcName, deleteType }) {
  if (!gateway || !receiptTable || !itemTable || !rpcName || !deleteType) throw new Error('document repository configuration is incomplete');

  async function listReceipts() {
    return gateway.selectOrg(receiptTable, '*', query => query.order?.('created_at', { ascending: false }) ?? query);
  }

  async function listItems() {
    return gateway.selectOrg(itemTable);
  }

  async function save(header, items = []) {
    if (!header || typeof header !== 'object') throw new TypeError('header is required');
    if (!Array.isArray(items)) throw new TypeError('items must be an array');
    return gateway.rpc(rpcName, { p_header: header, p_items: items });
  }

  async function remove(id) {
    if (!id) throw new TypeError('id is required');
    return gateway.rpc('ly_delete_receipt', { p_type: deleteType, p_id: id });
  }

  return Object.freeze({ listReceipts, listItems, save, remove });
}

export function createDocumentService({ repository, store, events, stateKey, eventPrefix }) {
  if (!repository || !store || !events || !stateKey || !eventPrefix) throw new Error('document service configuration is incomplete');

  async function refresh() {
    const [receipts, items] = await Promise.all([repository.listReceipts(), repository.listItems()]);
    const value = { receipts, items };
    store.patch({ [stateKey]: value }, { source: `${eventPrefix}:refresh` });
    events.emit(`${eventPrefix}:changed`, value);
    return value;
  }

  async function save(header, items = []) {
    const id = await repository.save(header, items);
    await refresh();
    events.emit(`${eventPrefix}:saved`, { id });
    return id;
  }

  async function remove(id) {
    const result = await repository.remove(id);
    await refresh();
    events.emit(`${eventPrefix}:removed`, { id });
    return result;
  }

  return Object.freeze({ refresh, save, remove });
}
