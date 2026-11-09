/** [LAYER: DOMAIN] */

/**
 * Contractual Sovereignty interface for swipes and mutual matches, scoped by event.
 * Zero I/O.
 */
export class IInteractionRepository {
  /**
   * Records (or replaces) one attendee's swipe on another.
   * @param {import("../match.mjs").Match} _swipe
   * @returns {Promise<void>}
   */
  async saveSwipe(_swipe) {
    throw new Error("IInteractionRepository.saveSwipe must be implemented by an infrastructure adapter.");
  }

  /**
   * @param {string} _eventId
   * @param {string} _fromAttendeeId
   * @param {string} _toAttendeeId
   * @returns {Promise<import("../match.mjs").Match | null>}
   */
  async findSwipe(_eventId, _fromAttendeeId, _toAttendeeId) {
    throw new Error("IInteractionRepository.findSwipe must be implemented by an infrastructure adapter.");
  }

  /**
   * Ids of attendees the given attendee has already swiped on (to exclude from discovery).
   * @param {string} _eventId
   * @param {string} _fromAttendeeId
   * @param {Object} [_options]
   * @param {"like"|"pass"} [_options.action] - only one kind of swipe
   * @returns {Promise<string[]>}
   */
  async listSwipedIds(_eventId, _fromAttendeeId, _options) {
    throw new Error("IInteractionRepository.listSwipedIds must be implemented by an infrastructure adapter.");
  }

  /**
   * Mutual matches that include the attendee.
   * @param {string} _eventId
   * @param {string} _attendeeId
   * @returns {Promise<import("../match.mjs").Match[]>}
   */
  async listMutualMatches(_eventId, _attendeeId) {
    throw new Error("IInteractionRepository.listMutualMatches must be implemented by an infrastructure adapter.");
  }

  /**
   * @param {string} _matchId
   * @returns {Promise<import("../match.mjs").Match | null>}
   */
  async findMatchById(_matchId) {
    throw new Error("IInteractionRepository.findMatchById must be implemented by an infrastructure adapter.");
  }

  /**
   * Removes an attendee's swipes (discovery reset).
   * @param {string} _eventId
   * @param {string} _fromAttendeeId
   * @param {Object} [_options]
   * @param {"like"|"pass"} [_options.action] - only remove this kind (e.g. "pass")
   * @returns {Promise<number>}
   */
  async deleteSwipes(_eventId, _fromAttendeeId, _options) {
    throw new Error("IInteractionRepository.deleteSwipes must be implemented by an infrastructure adapter.");
  }
}
