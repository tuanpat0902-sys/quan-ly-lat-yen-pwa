import { EventBus } from './core/event-bus.js';
import { createStore } from './core/store.js';
import { createSupabaseGateway } from './data/supabase-gateway.js';

export function createFreshCoreV2({ supabase, initialState = {}, getOrgId }) {
  const events = new EventBus();
  const store = createStore({
    session: null,
    orgId: null,
    activePanel: 'ingredients',
    connectivity: { online: true, realtime: false },
    ...initialState
  });

  const resolveOrgId = getOrgId ?? (() => store.getState().orgId);
  const data = createSupabaseGateway({ client: supabase, getOrgId: resolveOrgId });

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

  return Object.freeze({ version: '2.0.0-foundation', events, store, data, setSession, setOrg, setPanel });
}
