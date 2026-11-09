/** [LAYER: INFRASTRUCTURE] */

import { IAgendaRepository } from "../domain/interfaces/IAgendaRepository.mjs";
import { SOCIAL_SESSION_TYPES, CONTENT_SESSION_TYPES } from "../plumbing/sessionTypes.mjs";

const MAX_SESSIONS = 500;
const SOURCE_EXCLUDES = Object.freeze(["searchText", "embedding"]);

/**
 * Elasticsearch-backed IAgendaRepository over `cinder-sessions`.
 * Documents map to Session props with `fromSessionDoc` (the same mapping as
 * elasticsearch/cinder/compat_check.py `from_session`); entities come from the injected `toEntity`.
 */
export class ElasticsearchAgendaRepository extends IAgendaRepository {
  /**
   * @param {Object} deps
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} deps.esClient
   * @param {string} deps.index - e.g. "cinder-sessions"
   * @param {(props: Object) => any} [deps.toEntity] - `(p) => new Session(p)`
   * @param {string} [deps.embedModel] - inference endpoint used to embed topic text in findRelevant
   */
  constructor({ esClient, index, toEntity = (props) => props, embedModel = null }) {
    super();
    this.embedModel = embedModel;
    if (!esClient) throw new Error("ElasticsearchAgendaRepository requires esClient");
    if (!index) throw new Error("ElasticsearchAgendaRepository requires an index name");
    this.esClient = esClient;
    this.index = index;
    this.toEntity = toEntity;
  }

  /** @inheritdoc */
  async listByEvent(eventId) {
    return this.query([{ term: { eventId } }], MAX_SESSIONS);
  }

  /** @inheritdoc */
  async findById(sessionId) {
    if (!sessionId) return null;
    const doc = await this.esClient.get(this.index, sessionId);
    return doc ? this.toEntity(fromSessionDoc(doc)) : null;
  }

  /** @inheritdoc */
  async findNextSocialSlot(eventId, afterMs) {
    const found = await this.query([
      { term: { eventId } },
      { terms: { sessionType: [...SOCIAL_SESSION_TYPES] } },
      { range: { startDate: { gte: afterMs, format: "epoch_millis" } } }
    ], 1);
    return found[0] || null;
  }

  /** @inheritdoc */
  async findRelevant(eventId, vector, { sessionTypes = CONTENT_SESSION_TYPES, afterMs, limit = 3, text } = {}) {
    const filter = [{ term: { eventId } }, { terms: { sessionType: [...sessionTypes] } }];
    if (afterMs !== undefined) filter.push({ range: { startDate: { gte: afterMs, format: "epoch_millis" } } });
    const k = Math.max(limit, 20);
    const byVector = { field: "embedding", query_vector: vector, k, num_candidates: Math.max(100, k * 5), filter: { bool: { filter } } };
    const body = { size: limit, _source: { excludes: [...SOURCE_EXCLUDES] } };
    if (text && this.embedModel) {
      // A mixed group's centroid is generic; the topic text (weight 2) keeps talks on topic, the centroid refines.
      const byText = {
        field: "embedding", k, num_candidates: Math.max(100, k * 5), filter: { bool: { filter } },
        query_vector_builder: { text_embedding: { model_id: this.embedModel, model_text: `Talks about ${text}` } }
      };
      body.retriever = { rrf: { retrievers: [{ retriever: { knn: byVector }, weight: 1 }, { retriever: { knn: byText }, weight: 2 }], rank_window_size: k * 2 } };
    } else {
      body.knn = { ...byVector, k: limit };
    }
    const res = await this.esClient.search(this.index, body);
    return res.hits.map((h) => this.toEntity(fromSessionDoc(h.source)));
  }

  async query(filter, size) {
    const res = await this.esClient.search(this.index, {
      size,
      _source: { excludes: [...SOURCE_EXCLUDES] },
      query: { bool: { filter } },
      sort: [{ startDate: "asc" }, { "title.keyword": "asc" }]
    });
    return res.hits.map((h) => this.toEntity(fromSessionDoc(h.source)));
  }
}

/**
 * cinder-sessions document -> Session constructor props.
 * startDate/endDate carry the event's UTC offset, so characters 11-16 are the local wall-clock time.
 */
export function fromSessionDoc(s) {
  return {
    id: s.id,
    title: s.title,
    speakers: s.speakerNames || [],
    startTime: s.startDate.slice(11, 16),
    endTime: s.endDate.slice(11, 16),
    room: s.roomName,
    track: s.track || titleCase(s.sessionType),
    description: s.abstract || "",
    startDate: s.startDate,
    endDate: s.endDate,
    timezone: s.timezone || null,
    sessionType: s.sessionType || null,
    spaceId: s.spaceId || null
  };
}

function titleCase(value = "") {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}
