/** [LAYER: DOMAIN] */

/**
 * Contractual Sovereignty interface for an event's agenda sessions.
 * Zero I/O.
 */
export class IAgendaRepository {
  /**
   * Lists all sessions of an event in start order.
   * @param {string} _eventId
   * @returns {Promise<import("../agenda.mjs").Session[]>}
   */
  async listByEvent(_eventId) {
    throw new Error("IAgendaRepository.listByEvent must be implemented by an infrastructure adapter.");
  }

  /**
   * @param {string} _sessionId
   * @returns {Promise<import("../agenda.mjs").Session | null>}
   */
  async findById(_sessionId) {
    throw new Error("IAgendaRepository.findById must be implemented by an infrastructure adapter.");
  }

  /**
   * Finds the next break, lunch or networking session starting at or after a time (for pod meetups).
   * @param {string} _eventId
   * @param {number} _afterMs - epoch ms from the plumbing clock
   * @returns {Promise<import("../agenda.mjs").Session | null>}
   */
  async findNextSocialSlot(_eventId, _afterMs) {
    throw new Error("IAgendaRepository.findNextSocialSlot must be implemented by an infrastructure adapter.");
  }

  /**
   * Finds upcoming sessions semantically closest to a vector (e.g. a pod centroid or attendee profile).
   * @param {string} _eventId
   * @param {number[]} _vector
   * @param {Object} [_options]
   * @param {string[]} [_options.sessionTypes] - e.g. ["talk", "workshop", "keynote", "panel"]
   * @param {number} [_options.afterMs] - only sessions starting after this time
   * @param {number} [_options.limit=3]
   * @returns {Promise<import("../agenda.mjs").Session[]>}
   */
  async findRelevant(_eventId, _vector, _options) {
    throw new Error("IAgendaRepository.findRelevant must be implemented by an infrastructure adapter.");
  }
}
