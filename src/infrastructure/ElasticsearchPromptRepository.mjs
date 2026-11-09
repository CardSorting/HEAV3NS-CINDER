/** [LAYER: INFRASTRUCTURE] */

import { IPromptRepository } from "../domain/interfaces/IPromptRepository.mjs";

const FIELDS = Object.freeze(["id", "text", "phase", "topics"]);

/** RRF weights when a topic text is given: the text decides, the vector (Pod centroid) refines. */
const TEXT_WEIGHT = 2;
const VECTOR_WEIGHT = 1;

/**
 * Elasticsearch-backed IPromptRepository over `cinder-prompts` (prompts are embedded at ingest).
 */
export class ElasticsearchPromptRepository extends IPromptRepository {
  /**
   * @param {Object} deps
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} deps.esClient
   * @param {string} deps.index - e.g. "cinder-prompts"
   * @param {string} [deps.embedModel] - inference endpoint used to embed the topic text
   */
  constructor({ esClient, index, embedModel = null }) {
    super();
    if (!esClient) throw new Error("ElasticsearchPromptRepository requires esClient");
    if (!index) throw new Error("ElasticsearchPromptRepository requires an index name");
    this.esClient = esClient;
    this.index = index;
    this.embedModel = embedModel;
  }

  /** @inheritdoc */
  async findForVector(vector, { phase, limit = 1, text } = {}) {
    const filter = phase ? { term: { phase } } : undefined;
    const k = Math.max(limit, 10);
    const byVector = { field: "embedding", query_vector: vector, k, num_candidates: 100, ...(filter ? { filter } : {}) };
    if (!text || !this.embedModel) {
      const res = await this.esClient.search(this.index, { size: limit, _source: [...FIELDS], knn: { ...byVector, k: limit } });
      return res.hits.map((h) => pick(h.source));
    }
    const byText = {
      field: "embedding", k, num_candidates: 100, ...(filter ? { filter } : {}),
      query_vector_builder: { text_embedding: { model_id: this.embedModel, model_text: `Discussion questions about ${text}` } }
    };
    const res = await this.esClient.search(this.index, {
      size: limit,
      _source: [...FIELDS],
      retriever: {
        rrf: {
          retrievers: [{ retriever: { knn: byVector }, weight: VECTOR_WEIGHT }, { retriever: { knn: byText }, weight: TEXT_WEIGHT }],
          rank_window_size: Math.max(20, k * 2)
        }
      }
    });
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
