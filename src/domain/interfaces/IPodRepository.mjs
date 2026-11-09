/** [LAYER: DOMAIN] */

/**
 * Contractual Sovereignty interface for Pod persistence and state management.
 * Zero I/O.
 */
export class IPodRepository {
  /**
   * Persists a pod entity.
   * @param {import("../pod.mjs").Pod} _pod
   * @returns {Promise<void>}
   */
  async save(_pod) {
    throw new Error("IPodRepository.save must be implemented by an infrastructure adapter.");
  }

  /**
   * Retrieves a pod by its unique ID.
   * @param {string} _podId
   * @returns {Promise<import("../pod.mjs").Pod | null>}
   */
  async findById(_podId) {
    throw new Error("IPodRepository.findById must be implemented by an infrastructure adapter.");
  }

  /**
   * Finds the pod that contains a given attendee ID.
   * @param {string} _attendeeId
   * @returns {Promise<import("../pod.mjs").Pod | null>}
   */
  async findByMemberId(_attendeeId) {
    throw new Error("IPodRepository.findByMemberId must be implemented by an infrastructure adapter.");
  }

  /**
   * Lists pods, optionally only those formed at one event.
   * @param {string} [_eventId] - eventapp @id; all pods when omitted
   * @returns {Promise<import("../pod.mjs").Pod[]>}
   */
  async listAll(_eventId) {
    throw new Error("IPodRepository.listAll must be implemented by an infrastructure adapter.");
  }
}

