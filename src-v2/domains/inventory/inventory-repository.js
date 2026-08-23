export function createInventoryRepository({ gateway }) {
  if (!gateway) throw new Error('gateway is required');

  async function listBalances() {
    return gateway.selectOrg('ly_inventory');
  }

  async function listTransactions() {
    return gateway.selectOrg('ly_stock_transactions', '*', query => query.order?.('created_at', { ascending: false }) ?? query);
  }

  return Object.freeze({ listBalances, listTransactions });
}
