export function createSalesRepository({ gateway }) {
  if (!gateway) throw new Error('gateway is required');

  async function listSales() {
    return gateway.selectOrg('ly_sales', '*', query => query.order?.('created_at', { ascending: false }) ?? query);
  }

  async function listItems() {
    return gateway.selectOrg('ly_sale_items');
  }

  async function save(header, saleItems = [], stockLines = []) {
    if (!header || typeof header !== 'object') throw new TypeError('header is required');
    if (!Array.isArray(saleItems) || !Array.isArray(stockLines)) throw new TypeError('saleItems and stockLines must be arrays');
    return gateway.rpc('ly_save_sale', {
      p_header: header,
      p_sale_items: saleItems,
      p_stock_lines: stockLines
    });
  }

  async function remove(id) {
    if (!id) throw new TypeError('id is required');
    return gateway.rpc('ly_delete_receipt', { p_type: 'sale', p_id: id });
  }

  return Object.freeze({ listSales, listItems, save, remove });
}
