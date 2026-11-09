/** [LAYER: DOMAIN] */

/**
 * Contractual Sovereignty interface for Elasticsearch operations.
 * Zero I/O. Supports BM25 text query, dense_vector kNN search, and hybrid RRF retrieval.
 */
export class IElasticsearchClient {
  /**
   * Initializes the Elasticsearch index with appropriate mappings.
   * @returns {Promise<{ acknowledged: boolean, index: string }>}
   */
  async ensureIndex() {
    throw new Error("IElasticsearchClient.ensureIndex must be implemented by an infrastructure adapter.");
  }

  /**
   * Indexes or updates an attendee profile in Elasticsearch.
   * @param {import("../attendee.mjs").Attendee} _attendee
   * @returns {Promise<{ result: string, id: string }>}
   */
  async indexAttendee(_attendee) {
    throw new Error("IElasticsearchClient.indexAttendee must be implemented by an infrastructure adapter.");
  }

  /**
   * Performs hybrid search (BM25 multi_match + dense_vector kNN + RRF).
   * @param {Object} _params
   * @param {string} _params.queryText
   * @param {number[]} _params.queryVector
   * @param {string[]} [_params.excludeIds]
   * @param {number} [_params.limit]
   * @returns {Promise<{
   *   hits: Array<{ id: string, score: number, rrfScore: number, bm25Score: number, knnScore: number, source: any, explanation: string }>,
   *   totalHits: number,
   *   querySpec: any,
   *   tookMs: number
   * }>}
   */
  async hybridSearch(_params) {
    throw new Error("IElasticsearchClient.hybridSearch must be implemented by an infrastructure adapter.");
  }

  /**
   * Returns current cluster status, indices, and node statistics.
   * @returns {Promise<{ status: string, clusterName: string, docCount: number, mode: string }>}
   */
  async getStatus() {
    throw new Error("IElasticsearchClient.getStatus must be implemented by an infrastructure adapter.");
  }
}
