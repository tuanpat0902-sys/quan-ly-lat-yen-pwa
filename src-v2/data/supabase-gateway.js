const DEFAULT_TABLES = new Set([
  'ly_organizations','ly_org_members','ly_warehouses','ly_suppliers','ly_ingredients',
  'ly_inventory','ly_products','ly_prepared_items','ly_recipe_items','ly_import_receipts',
  'ly_import_items','ly_export_receipts','ly_export_items','ly_stock_transactions',
  'ly_stocktake_receipts','ly_stocktake_items','ly_sales','ly_sale_items',
  'ly_cashflow_entries','ly_sync_log','ly_activity_events','ly_notification_devices','ly_org_branding'
]);

const DEFAULT_RPCS = new Set([
  'ly_bootstrap','ly_delete_receipt','ly_save_export','ly_save_import','ly_save_ingredient',
  'ly_save_product','ly_save_sale','ly_save_stocktake','ly_set_menu_password',
  'ly_menu_password_status','ly_verify_menu_password','ly_disable_menu_password'
]);

export function createSupabaseGateway({ client, getOrgId, tables = DEFAULT_TABLES, rpcs = DEFAULT_RPCS }) {
  if (!client) throw new Error('Supabase client is required');
  if (typeof getOrgId !== 'function') throw new Error('getOrgId is required');
  if (typeof client.from !== 'function' || typeof client.rpc !== 'function') throw new Error('Invalid Supabase client');

  // Capture the original methods once. This lets a strangler/takeover layer wrap
  // the legacy client later without causing V2 repository calls to recurse back
  // through the legacy adapter.
  const fromClient = client.from.bind(client);
  const rpcClient = client.rpc.bind(client);

  function assertTable(table) {
    if (!tables.has(table)) throw new Error(`Table not allowed: ${table}`);
  }

  function assertRpc(name) {
    if (!rpcs.has(name)) throw new Error(`RPC not allowed: ${name}`);
  }

  function orgId() {
    const value = getOrgId();
    if (!value) throw new Error('Organization is not ready');
    return value;
  }

  function table(name) {
    assertTable(name);
    return fromClient(name);
  }

  async function rpc(name, params = {}) {
    assertRpc(name);
    const { data, error } = await rpcClient(name, params);
    if (error) throw error;
    return data;
  }

  async function selectOrg(name, columns = '*', configure) {
    assertTable(name);
    let query = fromClient(name).select(columns).eq('org_id', orgId());
    if (configure) query = configure(query) ?? query;
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async function insertOrg(name, rowOrRows, options = {}) {
    assertTable(name);
    const id = orgId();
    const input = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    if (!input.length) return [];
    const rows = input.map(row => ({ ...row, org_id: id }));
    let query = fromClient(name).insert(rows);
    if (options.select !== false) query = query.select(options.columns || '*');
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async function updateOrg(name, patch, configure) {
    assertTable(name);
    let query = fromClient(name).update(patch).eq('org_id', orgId());
    if (configure) query = configure(query) ?? query;
    const { data, error } = await query.select('*');
    if (error) throw error;
    return data ?? [];
  }

  async function deleteOrg(name, configure) {
    assertTable(name);
    let query = fromClient(name).delete().eq('org_id', orgId());
    if (configure) query = configure(query) ?? query;
    const { data, error } = await query.select('*');
    if (error) throw error;
    return data ?? [];
  }

  return Object.freeze({ table, rpc, selectOrg, insertOrg, updateOrg, deleteOrg });
}
