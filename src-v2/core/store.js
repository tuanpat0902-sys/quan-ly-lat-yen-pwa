export function createStore(initialState = {}) {
  let state = structuredClone(initialState);
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(updater, meta = {}) {
    const next = typeof updater === 'function' ? updater(state) : updater;
    if (next === state) return state;
    state = next;
    for (const listener of [...listeners]) listener(state, meta);
    return state;
  }

  function patch(partial, meta = {}) {
    return setState(current => ({ ...current, ...partial }), meta);
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('listener must be a function');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, setState, patch, subscribe };
}
