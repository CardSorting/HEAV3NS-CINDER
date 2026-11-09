/** [LAYER: DOMAIN] */

/**
 * Contractual Sovereignty interface for pod chat and 1:1 direct messages between mutual matches.
 * Zero I/O.
 */
export class IMessageRepository {
  /**
   * @param {import("../message.mjs").Message} _message
   * @returns {Promise<void>}
   */
  async appendPodMessage(_message) {
    throw new Error("IMessageRepository.appendPodMessage must be implemented by an infrastructure adapter.");
  }

  /**
   * Pod messages in chronological order.
   * @param {string} _podId
   * @param {Object} [_options]
   * @param {number} [_options.limit=200]
   * @returns {Promise<import("../message.mjs").Message[]>}
   */
  async listPodMessages(_podId, _options) {
    throw new Error("IMessageRepository.listPodMessages must be implemented by an infrastructure adapter.");
  }

  /**
   * @param {{ id: string, eventId: string, matchId: string, senderId: string, senderName: string, content: string, timestamp: string }} _message
   * @returns {Promise<void>}
   */
  async appendDirectMessage(_message) {
    throw new Error("IMessageRepository.appendDirectMessage must be implemented by an infrastructure adapter.");
  }

  /**
   * Direct messages of one match in chronological order.
   * @param {string} _matchId
   * @param {Object} [_options]
   * @param {number} [_options.limit=200]
   * @returns {Promise<Array<{ id: string, eventId: string, matchId: string, senderId: string, senderName: string, content: string, timestamp: string }>>}
   */
  async listDirectMessages(_matchId, _options) {
    throw new Error("IMessageRepository.listDirectMessages must be implemented by an infrastructure adapter.");
  }
}
