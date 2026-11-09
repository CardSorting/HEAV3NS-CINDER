/** [LAYER: DOMAIN] */

/**
 * Contractual Sovereignty interface for selectable events (conference, academic, meetup, expo).
 * Zero I/O.
 */
export class IEventRepository {
  /**
   * Lists events with CINDER data that are not cancelled, sorted by start date.
   * @param {Object} [_options]
   * @param {string[]} [_options.categories] - subset of SELECTABLE_CATEGORIES
   * @param {string} [_options.from] - ISO date; events ending on/after it
   * @param {string} [_options.to] - ISO date; events starting on/before it
   * @param {number} [_options.limit=50]
   * @returns {Promise<import("../conferenceEvent.mjs").ConferenceEvent[]>}
   */
  async listSelectable(_options) {
    throw new Error("IEventRepository.listSelectable must be implemented by an infrastructure adapter.");
  }

  /**
   * Finds one event by its eventapp @id (selectable or not).
   * @param {string} _eventId
   * @returns {Promise<import("../conferenceEvent.mjs").ConferenceEvent | null>}
   */
  async findById(_eventId) {
    throw new Error("IEventRepository.findById must be implemented by an infrastructure adapter.");
  }
}
