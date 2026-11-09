/** [LAYER: INFRASTRUCTURE] */

import { IEventBus } from "../domain/interfaces/IEventBus.mjs";

/**
 * In-memory realtime event bus adapter.
 * Implements IEventBus.
 */
export class SimpleEventBus extends IEventBus {
  constructor() {
    super();
    this.listeners = new Map();
  }

  publish(eventName, payload) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for ${eventName}:`, err);
      }
    }
  }

  subscribe(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    const handlers = this.listeners.get(eventName);
    handlers.add(handler);

    return () => {
      this.unsubscribe(eventName, handler);
    };
  }

  unsubscribe(eventName, handler) {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  dispose() {
    this.listeners.clear();
  }
}
