/** [LAYER: INFRASTRUCTURE] */

import { IPromptRepository } from "../domain/interfaces/IPromptRepository.mjs";

const FIELDS = Object.freeze(["id", "text", "phase", "topics"]);

/**
 * Elasticsearch-backed IPromptRepository over `cinder-prompts` (prompts are embedded at ingest).
 */
export class ElasticsearchPromptRepository extends IPromptRepository {
  /**
   * @param {Object} deps
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} deps.esClient
   * @param {string} deps.index - e.g. "cinder-prompts"
   */
  constructor({ esClient, index }) {
    super();
    if (!esClient) throw new Error("ElasticsearchPromptRepository requires esClient");
    if (!index) throw new Error("ElasticsearchPromptRepository requires an index name");
    this.esClient = esClient;
    this.index = index;
  }

  /** @inheritdoc */
  async findForVector(vector, { phase, limit = 1 } = {}) {
    const knn = { field: "embedding", query_vector: vector, k: limit, num_candidates: 100 };
    if (phase) knn.filter = { term: { phase } };
    const res = await this.esClient.search(this.index, { size: limit, _source: [...FIELDS], knn });
    return res.hits.map((h) => pick(h.source));
  }

  /** @inheritdoc */
  async listByPhase(phase) {
    const res = await this.esClient.search(this.index, {
      size: 200, _source: [...FIELDS], query: { bool: { filter: [{ term: { phase } }] } }, sort: [{ id: "asc" }]
    });
    return res.hits.map((h) => pick(h.source));
  }
}

function pick({ id, text, phase, topics }) {
  return { id, text, phase, topics: topics || [] };
}
