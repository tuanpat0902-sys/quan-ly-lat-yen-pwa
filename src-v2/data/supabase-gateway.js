const DEFAULT_TABLES = new Set([
  'ly_organizations','ly_org_members','ly_warehouses','ly_suppliers','ly_ingredients',
  'ly_inventory','ly_products','ly_prepared_items','ly_recipe_items','ly_import_receipts',
  'ly_import_items','ly_export_receipts','ly_export_items','ly_stock_transactions',
  'ly_stocktake_receipts','ly_stocktake_items','ly_sales','ly_sale_items',
  'ly_cashflow_entries','ly_sync_log','ly_activity_events','ly_notification_devices','ly_org_branding'
]);

const DEFAULT_RPCS = new Set([
  'ly_bootstrap','ly_post_import','ly_post_export','ly_post_sale','ly_post_stocktake',
  'ly_flush_sync_log','ly_rebuild_stock','ly_delete_receipt','ly_save_export','ly_save_import',
  'ly_save_ingredient','ly_save_product','ly_save_sale','ly_save_stocktake',
  'ly_set_menu_password','ly_menu_password_status','ly_verify_menu_password','ly_disable_menu_password'
]);

export function createSupabaseGateway({ client, getOrgId, tables = DEFAULT_TABLES, rpcs = DEFAULT_RPCS }) {
  if (!client) throw new Error('Supabase client is required');
  if (typeof getOrgId !== 'function') throw new Error('getOrgId is required');

  function assertTable(table) {
    if (!tables.has(table)) throw new Error(`Table not allowed: ${table}`);
  }

  function assertRpc(name) {
    if (!rpcs.has(name)) throw new Error(`RPC not allowed: ${name}`);
  }

  function table(name) {
    assertTable(name);
    return client.from(name);
  }

  async function rpc(name, params = {}) {
    assertRpc(name);
    const { data, error } = await client.rpc(name, params);
    if (error) throw error;
    return data;
  }

  async function selectOrg(name, columns = '*', configure) {
    assertTable(name);
    const orgId = getOrgId();
    if (!orgId) throw new Error('Organization is not ready');
    let query = client.from(name).select(columns).eq('org_id', orgId);
    if (configure) query = configure(query) ?? query;
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  return Object.freeze({ table, rpc, selectOrg });
}
