/**
 * Decoupled Pub/Sub Event Dispatcher for Flappy Bird Game Engine
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe a callback to an event.
   * @param {string} event - Event name
   * @param {Function} callback - Listener function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (typeof callback !== 'function') return () => {};
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe a callback from an event.
   * @param {string} event - Event name
   * @param {Function} callback - Listener function to remove
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const set = this.listeners.get(event);
    set.delete(callback);
    if (set.size === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit an event with optional data payload.
   * Isolates listener execution errors so one listener exception does not break others.
   * @param {string} event - Event name
   * @param {*} data - Data payload to pass to subscribers
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    // Shallow copy subscriber set to avoid issues if subscribers mutate during emit
    const callbacks = Array.from(this.listeners.get(event));
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (err) {
        console.error(`[EventBus] Error handling event "${event}":`, err);
      }
    }
  }

  /**
   * Remove all event listeners.
   */
  clear() {
    this.listeners.clear();
  }
}
