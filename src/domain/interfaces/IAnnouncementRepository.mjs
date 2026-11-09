/** [LAYER: DOMAIN] */

/**
 * Contractual Sovereignty interface for conference-wide announcements.
 * Zero I/O.
 */
export class IAnnouncementRepository {
  /**
   * Lists an event's announcements in publish order.
   * @param {string} _eventId
   * @param {Object} [_options]
   * @param {number} [_options.publishedBeforeMs] - only announcements already published at this time
   * @returns {Promise<import("../announcement.mjs").Announcement[]>}
   */
  async listByEvent(_eventId, _options) {
    throw new Error("IAnnouncementRepository.listByEvent must be implemented by an infrastructure adapter.");
  }

  /**
   * Lists published announcements that concern any of the given sessions or spaces.
   * @param {string} _eventId
   * @param {{ sessionIds?: string[], spaceIds?: string[] }} _refs
   * @param {number} _publishedBeforeMs
   * @returns {Promise<import("../announcement.mjs").Announcement[]>}
   */
  async listAffecting(_eventId, _refs, _publishedBeforeMs) {
    throw new Error("IAnnouncementRepository.listAffecting must be implemented by an infrastructure adapter.");
  }
}
