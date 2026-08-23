export function createMasterDataRepository({ gateway }) {
  if (!gateway) throw new Error('gateway is required');

  async function listWarehouses() {
    return gateway.selectOrg('ly_warehouses', '*', query => query.order?.('created_at', { ascending: true }) ?? query);
  }

  async function listSuppliers() {
    return gateway.selectOrg('ly_suppliers', '*', query => query.order?.('name', { ascending: true }) ?? query);
  }

  async function saveWarehouse(warehouse, purchasedIngredientIds = []) {
    if (!warehouse || typeof warehouse !== 'object') throw new TypeError('warehouse is required');
    const rows = await gateway.upsertOrg('ly_warehouses', warehouse);
    const saved = rows[0] ?? warehouse;
    if (purchasedIngredientIds.length) {
      await gateway.upsertOrg(
        'ly_inventory',
        purchasedIngredientIds.map(ingredientId => ({ warehouse_id: warehouse.id, ingredient_id: ingredientId, quantity: 0 })),
        { onConflict: 'org_id,warehouse_id,ingredient_id', select: false }
      );
    }
    return saved;
  }

  async function saveSupplier(supplier) {
    if (!supplier || typeof supplier !== 'object') throw new TypeError('supplier is required');
    const rows = await gateway.upsertOrg('ly_suppliers', supplier);
    return rows[0] ?? supplier;
  }

  async function ensureSupplierByName(name) {
    const clean = String(name || '').trim();
    if (!clean) return null;
    const suppliers = await listSuppliers();
    const existing = suppliers.find(x => String(x.name || '').trim().toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    const id = globalThis.crypto?.randomUUID?.();
    if (!id) throw new Error('randomUUID is unavailable');
    return saveSupplier({ id, name: clean, phone: '', address: '', note: '' });
  }

  return Object.freeze({ listWarehouses, listSuppliers, saveWarehouse, saveSupplier, ensureSupplierByName });
}
