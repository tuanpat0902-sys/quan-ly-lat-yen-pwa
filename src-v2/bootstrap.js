import { EventBus } from './core/event-bus.js';
import { createStore } from './core/store.js';
import { createSupabaseGateway } from './data/supabase-gateway.js';
import { createDomains } from './domains/create-domains.js';

export function createFreshCoreV2({ supabase, initialState = {}, getOrgId }) {
  const events = new EventBus();
  const store = createStore({
    session: null,
    orgId: null,
    activePanel: 'ingredients',
    connectivity: { online: true, realtime: false },
    ingredients: [],
    preparedItems: [],
    products: [],
    recipeItems: [],
    importsData: { receipts: [], items: [] },
    exportsData: { receipts: [], items: [] },
    stocktakeData: { receipts: [], items: [] },
    salesData: { sales: [], items: [] },
    cashflowEntries: [],
    ...initialState
  });

  const resolveOrgId = getOrgId ?? (() => store.getState().orgId);
  const data = createSupabaseGateway({ client: supabase, getOrgId: resolveOrgId });
  const domains = createDomains({ gateway: data, store, events });

  function setSession(session) {
    store.patch({ session }, { source: 'auth' });
    events.emit('auth:session', session);
  }

  function setOrg(orgId) {
    store.patch({ orgId }, { source: 'organization' });
    events.emit('org:changed', orgId);
  }

  function setPanel(activePanel) {
    store.patch({ activePanel }, { source: 'navigation' });
    events.emit('panel:changed', activePanel);
  }

  async function refreshCoreDomains() {
    const results = await Promise.all([
      domains.ingredients.refresh(),
      domains.products.refresh(),
      domains.imports.refresh(),
      domains.exports.refresh(),
      domains.stocktake.refresh(),
      domains.sales.refresh(),
      domains.cashflow.refresh()
    ]);
    events.emit('core:refreshed', { at: Date.now() });
    return results;
  }

  return Object.freeze({
    version: '2.2.0-ingredients-takeover-ready',
    events,
    store,
    data,
    domains,
    setSession,
    setOrg,
    setPanel,
    refreshCoreDomains
  });
}
