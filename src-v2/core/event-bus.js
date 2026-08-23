export class EventBus {
  #listeners = new Map();

  on(type, handler) {
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');
    const set = this.#listeners.get(type) ?? new Set();
    set.add(handler);
    this.#listeners.set(type, set);
    return () => this.off(type, handler);
  }

  once(type, handler) {
    const off = this.on(type, payload => {
      off();
      handler(payload);
    });
    return off;
  }

  off(type, handler) {
    const set = this.#listeners.get(type);
    if (!set) return;
    set.delete(handler);
    if (!set.size) this.#listeners.delete(type);
  }

  emit(type, payload) {
    const set = this.#listeners.get(type);
    if (!set) return;
    for (const handler of [...set]) handler(payload);
  }

  clear(type) {
    if (typeof type === 'string') this.#listeners.delete(type);
    else this.#listeners.clear();
  }
}
