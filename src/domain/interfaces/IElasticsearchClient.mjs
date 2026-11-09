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

  /**
   * Fast health check probe for Elasticsearch cluster.
   * @param {number} [_timeoutMs]
   * @returns {Promise<{ live: boolean, status: string, mode: string }>}
   */
  async checkHealth(_timeoutMs) {
    throw new Error("IElasticsearchClient.checkHealth must be implemented by an infrastructure adapter.");
  }

  // ---------------------------------------------------------------------------------------------
  // Generic document and inference operations used by the Elasticsearch-backed repositories.
  // Index arguments are concrete index names (resolved from configuration by the caller).
  // ---------------------------------------------------------------------------------------------

  /**
   * Runs a search request (Query DSL, `knn`, or `retriever` body).
   * @param {string} _index
   * @param {Object} _body  Search body, e.g. `{ query, knn, retriever, size, sort, _source }`.
   * @param {Object} [_options]
   * @param {boolean} [_options.includeVectors=false]  Return dense_vector fields in `_source`
   *   (they are excluded by default on Elasticsearch 9.x).
   * @returns {Promise<{ hits: Array<{ id: string, score: number|null, source: Object }>, total: number, tookMs: number, raw: Object }>}
   */
  async search(_index, _body, _options) {
    throw new Error("IElasticsearchClient.search must be implemented by an infrastructure adapter.");
  }

  /**
   * Counts documents matching a query.
   * @param {string} _index
   * @param {Object} [_query]  Query DSL; all documents when omitted.
   * @returns {Promise<number>}
   */
  async count(_index, _query) {
    throw new Error("IElasticsearchClient.count must be implemented by an infrastructure adapter.");
  }

  /**
   * Fetches one document by id.
   * @param {string} _index
   * @param {string} _id
   * @param {Object} [_options]
   * @param {boolean} [_options.includeVectors=false]
   * @returns {Promise<Object|null>} The document `_source`, or null when not found.
   */
  async get(_index, _id, _options) {
    throw new Error("IElasticsearchClient.get must be implemented by an infrastructure adapter.");
  }

  /**
   * Creates or replaces a document. The index's default/final pipelines run on write.
   * @param {string} _index
   * @param {Object} _doc
   * @param {Object} [_options]
   * @param {string} [_options.id]  Document id; defaults to `doc.id`.
   * @param {"true"|"false"|"wait_for"} [_options.refresh="false"]
   * @returns {Promise<{ id: string, result: string }>}
   */
  async index(_index, _doc, _options) {
    throw new Error("IElasticsearchClient.index must be implemented by an infrastructure adapter.");
  }

  /**
   * Partially updates a document.
   * @param {string} _index
   * @param {string} _id
   * @param {Object} _changes  `{ doc }` for a partial merge or `{ script }` for a scripted update.
   * @param {Object} [_options]
   * @param {"true"|"false"|"wait_for"} [_options.refresh="false"]
   * @param {number} [_options.retryOnConflict=3]
   * @returns {Promise<{ id: string, result: string }>}
   */
  async update(_index, _id, _changes, _options) {
    throw new Error("IElasticsearchClient.update must be implemented by an infrastructure adapter.");
  }

  /**
   * Deletes all documents matching a query.
   * @param {string} _index
   * @param {Object} _query  Query DSL (required; never deletes everything implicitly).
   * @param {Object} [_options]
   * @param {boolean} [_options.refresh=false]
   * @returns {Promise<{ deleted: number }>}
   */
  async deleteByQuery(_index, _query, _options) {
    throw new Error("IElasticsearchClient.deleteByQuery must be implemented by an infrastructure adapter.");
  }

  /**
   * Executes bulk write operations.
   * @param {Array<{ action: "index"|"create"|"update"|"delete", index: string, id: string, doc?: Object }>} _operations
   * @param {Object} [_options]
   * @param {"true"|"false"|"wait_for"} [_options.refresh="false"]
   * @returns {Promise<{ errors: boolean, items: Array<{ id: string, status: number, error: Object|null }> }>}
   */
  async bulk(_operations, _options) {
    throw new Error("IElasticsearchClient.bulk must be implemented by an infrastructure adapter.");
  }

  /**
   * Computes text embeddings with an inference endpoint.
   * Use `inputType: "ingest"` for documents (matches the ingest pipelines) and `"search"` for queries.
   * @param {string[]} _texts
   * @param {Object} [_options]
   * @param {"ingest"|"search"} [_options.inputType="ingest"]
   * @param {string} [_options.modelId]  Defaults to the configured embedding model.
   * @returns {Promise<number[][]>}
   */
  async embed(_texts, _options) {
    throw new Error("IElasticsearchClient.embed must be implemented by an infrastructure adapter.");
  }

  /**
   * Runs a chat completion through an Elasticsearch inference endpoint.
   * @param {Array<{ role: "system"|"user"|"assistant", content: string }>} _messages
   * @param {Object} [_options]
   * @param {string} [_options.modelId]  Chat-completion inference endpoint id.
   * @param {number} [_options.timeoutMs]
   * @returns {Promise<{ content: string, modelId: string }>}
   */
  async chatCompletion(_messages, _options) {
    throw new Error("IElasticsearchClient.chatCompletion must be implemented by an infrastructure adapter.");
  }
}

