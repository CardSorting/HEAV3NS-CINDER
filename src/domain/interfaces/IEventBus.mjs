/** [LAYER: DOMAIN] */

/**
 * Contractual Sovereignty interface for the Realtime Event Bus.
 * Dispatches domain events (attendee checked in, match made, pod formed, message sent, meetup pinned).
 * Zero I/O.
 */
export class IEventBus {
  /**
   * Publishes an event to all registered listeners.
   * @param {string} _eventName
   * @param {any} _payload
   */
  publish(_eventName, _payload) {
    throw new Error("IEventBus.publish must be implemented by an infrastructure adapter.");
  }

  /**
   * Subscribes a listener to an event.
   * @param {string} _eventName
   * @param {(payload: any) => void} _handler
   * @returns {() => void} unsubscribe function
   */
  subscribe(_eventName, _handler) {
    throw new Error("IEventBus.subscribe must be implemented by an infrastructure adapter.");
  }

  /**
   * Unsubscribes a listener from an event.
   * @param {string} _eventName
   * @param {(payload: any) => void} _handler
   */
  unsubscribe(_eventName, _handler) {
    throw new Error("IEventBus.unsubscribe must be implemented by an infrastructure adapter.");
  }
}
