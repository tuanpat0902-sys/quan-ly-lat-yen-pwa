export function createCashflowRepository({ gateway }) {
  if (!gateway) throw new Error('gateway is required');

  async function list() {
    return gateway.selectOrg('ly_cashflow_entries', '*', query => query.order?.('entry_date', { ascending: false }) ?? query);
  }

  async function create(entry) {
    if (!entry || typeof entry !== 'object') throw new TypeError('entry is required');
    const rows = await gateway.insertOrg('ly_cashflow_entries', entry);
    return rows[0] ?? null;
  }

  async function update(id, patch) {
    if (!id) throw new TypeError('id is required');
    const rows = await gateway.updateOrg('ly_cashflow_entries', patch, query => query.eq('id', id));
    return rows[0] ?? null;
  }

  async function remove(id) {
    if (!id) throw new TypeError('id is required');
    const rows = await gateway.deleteOrg('ly_cashflow_entries', query => query.eq('id', id));
    return rows[0] ?? null;
  }

  return Object.freeze({ list, create, update, remove });
}
