/** [LAYER: DOMAIN] */

/**
 * Contractual Sovereignty interface for Attendee persistence.
 * Zero I/O. Implemented by concrete adapters in src/infrastructure/.
 */
export class IAttendeeRepository {
  /**
   * Persists an attendee entity.
   * @param {import("../attendee.mjs").Attendee} _attendee
   * @returns {Promise<void>}
   */
  async save(_attendee) {
    throw new Error("IAttendeeRepository.save must be implemented by an infrastructure adapter.");
  }

  /**
   * Retrieves an attendee by ID.
   * @param {string} _id
   * @param {Object} [_options]
   * @param {boolean} [_options.includeVectors=false] - load the stored profile embedding (needed when it is
   *   reused as a kNN query vector; Elasticsearch excludes vectors from _source by default)
   * @param {string} [_options.eventId] - also require the attendee to belong to this event
   * @returns {Promise<import("../attendee.mjs").Attendee | null>}
   */
  async findById(_id, _options) {
    throw new Error("IAttendeeRepository.findById must be implemented by an infrastructure adapter.");
  }

  /**
   * Lists attendees, optionally only those registered for one event.
   * @param {string} [_eventId] - eventapp @id; all attendees when omitted
   * @returns {Promise<import("../attendee.mjs").Attendee[]>}
   */
  async listAll(_eventId) {
    throw new Error("IAttendeeRepository.listAll must be implemented by an infrastructure adapter.");
  }
}

