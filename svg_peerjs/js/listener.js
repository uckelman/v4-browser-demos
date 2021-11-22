export const ListenerSupport = {
  on(type, listener) {
    if (!(type in this.listeners)) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);

//    (this.listeners[type] || (this.listeners[type] = [])).push(listener);
  },

  off(type, listener) {
    const ll = this.listeners[type];
    if (ll) {
      const i = ll.indexOf(listener);
      if (i >= 0) {
        ll.splice(i, 1);
      }
    }
  },

  notify(type, msg) {
    const ll = this.listeners[type];
    if (ll) {
      for (const l of ll) {
        l(msg);
      }
    }

//    (this.listeners[type] || []).forEach(l => l(msg));
  }
}
