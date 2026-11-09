/** [LAYER: DOMAIN] */

/**
 * Contractual Sovereignty interface for venue rooms and meetup spots.
 * Zero I/O.
 */
export class ISpaceRepository {
  /**
   * Lists the spaces available at an event: its physical venue's spaces, or the event's virtual spaces.
   * @param {string} _eventId
   * @param {Object} [_options]
   * @param {boolean} [_options.meetupFriendlyOnly=false]
   * @returns {Promise<import("../venueSpace.mjs").VenueSpace[]>}
   */
  async listForEvent(_eventId, _options) {
    throw new Error("ISpaceRepository.listForEvent must be implemented by an infrastructure adapter.");
  }

  /**
   * @param {string} _spaceId
   * @returns {Promise<import("../venueSpace.mjs").VenueSpace | null>}
   */
  async findById(_spaceId) {
    throw new Error("ISpaceRepository.findById must be implemented by an infrastructure adapter.");
  }
}
