export function createMasterDataRepository({ gateway }) {
  if (!gateway) throw new Error('gateway is required');

  async function listWarehouses() {
    return gateway.selectOrg('ly_warehouses', '*', query => query.order?.('created_at', { ascending: true }) ?? query);
  }

  async function listSuppliers() {
    return gateway.selectOrg('ly_suppliers', '*', query => query.order?.('name', { ascending: true }) ?? query);
  }

  async function saveWarehouse(warehouse) {
    if (!warehouse || typeof warehouse !== 'object') throw new TypeError('warehouse is required');
    const rows = await gateway.upsertOrg('ly_warehouses', warehouse);
    return rows[0] ?? warehouse;
  }

  async function initializeInventory(rows) {
    const input = Array.isArray(rows) ? rows : [rows];
    if (!input.length) return [];
    return gateway.upsertOrg('ly_inventory', input, { onConflict: 'org_id,warehouse_id,ingredient_id', select: false });
  }

  async function saveSupplier(supplier) {
    if (!supplier || typeof supplier !== 'object') throw new TypeError('supplier is required');
    const rows = await gateway.upsertOrg('ly_suppliers', supplier);
    return rows[0] ?? supplier;
  }

  return Object.freeze({ listWarehouses, listSuppliers, saveWarehouse, initializeInventory, saveSupplier });
}
