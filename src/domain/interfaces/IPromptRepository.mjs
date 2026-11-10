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
   * @param {string} [_options.text] - topic text (e.g. the Pod theme) fused with the vector; centroids of mixed
   *   groups are generic and favour "hub" prompts, the theme keeps prompts on topic
   * @param {string[]} [_options.topics] - only prompts tagged with one of these topics (e.g. the event's labels);
   *   generic prompts (topic "*" or no topics) always qualify
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
