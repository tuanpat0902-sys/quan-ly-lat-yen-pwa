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

  async function warehouseUsage(id) {
    if (!id) throw new TypeError('warehouse id is required');
    const [imports, exports, stocktakes, sales] = await Promise.all([
      gateway.selectOrg('ly_import_receipts', 'id', q => q.eq('warehouse_id', id)),
      gateway.selectOrg('ly_export_receipts', 'id', q => q.eq('warehouse_id', id)),
      gateway.selectOrg('ly_stocktake_receipts', 'id', q => q.eq('warehouse_id', id)),
      gateway.selectOrg('ly_sales', 'id', q => q.eq('warehouse_id', id))
    ]);
    return { imports: imports.length, exports: exports.length, stocktakes: stocktakes.length, sales: sales.length };
  }

  async function removeWarehouse(id) {
    if (!id) throw new TypeError('warehouse id is required');
    const usage = await warehouseUsage(id);
    const blocked = Object.entries(usage).filter(([, count]) => count > 0);
    if (blocked.length) {
      const detail = blocked.map(([kind, count]) => `${kind}:${count}`).join(', ');
      throw new Error(`Kho đang có phiếu liên quan (${detail}). Hãy xóa/chuyển các phiếu trước khi xóa kho.`);
    }
    await gateway.deleteOrg('ly_inventory', query => query.eq('warehouse_id', id));
    const rows = await gateway.deleteOrg('ly_warehouses', query => query.eq('id', id));
    return rows[0] ?? { id };
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

  return Object.freeze({ listWarehouses, listSuppliers, saveWarehouse, warehouseUsage, removeWarehouse, initializeInventory, saveSupplier });
}
