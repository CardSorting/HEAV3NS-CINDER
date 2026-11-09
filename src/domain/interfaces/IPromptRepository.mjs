/** [LAYER: DOMAIN] */

/**
 * Contractual Sovereignty interface for facilitator discussion prompts.
 * Zero I/O.
 */
export class IPromptRepository {
  /**
   * Finds prompts semantically closest to a vector (e.g. a pod centroid).
   * @param {number[]} _vector
   * @param {Object} [_options]
   * @param {"icebreaker"|"deep-dive"|"wrap-up"} [_options.phase]
   * @param {number} [_options.limit=1]
   * @returns {Promise<Array<{ id: string, text: string, phase: string, topics: string[] }>>}
   */
  async findForVector(_vector, _options) {
    throw new Error("IPromptRepository.findForVector must be implemented by an infrastructure adapter.");
  }

  /**
   * @param {"icebreaker"|"deep-dive"|"wrap-up"} _phase
   * @returns {Promise<Array<{ id: string, text: string, phase: string, topics: string[] }>>}
   */
  async listByPhase(_phase) {
    throw new Error("IPromptRepository.listByPhase must be implemented by an infrastructure adapter.");
  }
}
