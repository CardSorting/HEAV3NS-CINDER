/** [LAYER: INFRASTRUCTURE] */

import { IInteractionRepository } from "../domain/interfaces/IInteractionRepository.mjs";

const MAX_ROWS = 1000;

/**
 * Elasticsearch-backed IInteractionRepository over `cinder-interactions`.
 *
 * Storage model:
 * - One document per directed swipe, with a deterministic `_id` (event + swiper + target), so a re-swipe
 *   replaces the previous one.
 * - A mutual match is the swipe that completed it, saved with `mutual: true` and the Match's own `id`;
 *   `findMatchById` / `listMutualMatches` query those documents.
 * - Discovery resets never delete mutual-match documents (matches and their direct messages survive).
 *
 * Writes refresh immediately (default "true") because the next discovery request must already exclude
 * what was just swiped. Entities are built by an injected `toEntity` factory (`(p) => new Match(p)`).
 */
export class ElasticsearchInteractionRepository extends IInteractionRepository {
  /**
   * @param {Object} deps
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} deps.esClient
   * @param {string} deps.index - e.g. "cinder-interactions"
   * @param {string|null} [deps.defaultEventId=null] - event used when a swipe/call does not name one
   * @param {(props: Object) => any} [deps.toEntity]
   * @param {"true"|"false"|"wait_for"} [deps.refresh="true"]
   */
  constructor({ esClient, index, defaultEventId = null, toEntity = (props) => props, refresh = "true" }) {
    super();
    if (!esClient) throw new Error("ElasticsearchInteractionRepository requires esClient");
    if (!index) throw new Error("ElasticsearchInteractionRepository requires an index name");
    this.esClient = esClient;
    this.index = index;
    this.defaultEventId = defaultEventId;
    this.toEntity = toEntity;
    this.refresh = refresh;
  }

  /** @inheritdoc */
  async saveSwipe(swipe) {
    const json = typeof swipe?.toJSON === "function" ? swipe.toJSON() : { ...swipe };
    const eventId = this.scope(json.eventId);
    if (!json.id || !json.initiatorId || !json.targetId || !json.action) {
      throw new Error("saveSwipe requires id, initiatorId, targetId and action");
    }
    const doc = {
      id: json.id,
      eventId,
      initiatorId: json.initiatorId,
      targetId: json.targetId,
      action: json.action,
      mutual: Boolean(json.mutual),
      explanation: json.explanation || "",
      createdAt: json.createdAt || new Date().toISOString()
    };
    if (json.scores) doc.scores = json.scores;
    await this.esClient.index(this.index, doc, { id: swipeDocId(eventId, doc.initiatorId, doc.targetId), refresh: this.refresh });
  }

  /** @inheritdoc */
  async findSwipe(eventId, fromAttendeeId, toAttendeeId) {
    const doc = await this.esClient.get(this.index, swipeDocId(this.scope(eventId), fromAttendeeId, toAttendeeId));
    return doc ? this.toEntity(doc) : null;
  }

  /** @inheritdoc */
  async listSwipedIds(eventId, fromAttendeeId, { action } = {}) {
    const filter = [{ term: { eventId: this.scope(eventId) } }, { term: { initiatorId: fromAttendeeId } }];
    if (action) filter.push({ term: { action } });
    const res = await this.esClient.search(this.index, { size: MAX_ROWS, _source: ["targetId"], query: { bool: { filter } } });
    return res.hits.map((h) => h.source.targetId);
  }

  /** @inheritdoc */
  async listMutualMatches(eventId, attendeeId) {
    const res = await this.esClient.search(this.index, {
      size: MAX_ROWS,
      query: {
        bool: {
          filter: [{ term: { eventId: this.scope(eventId) } }, { term: { mutual: true } }],
          should: [{ term: { initiatorId: attendeeId } }, { term: { targetId: attendeeId } }],
          minimum_should_match: 1
        }
      },
      sort: [{ createdAt: "desc" }]
    });
    return res.hits.map((h) => this.toEntity(h.source));
  }

  /** @inheritdoc */
  async findMatchById(matchId) {
    if (!matchId) return null;
    const res = await this.esClient.search(this.index, {
      size: 1,
      query: { bool: { filter: [{ term: { id: matchId } }, { term: { mutual: true } }] } }
    });
    return res.hits[0] ? this.toEntity(res.hits[0].source) : null;
  }

  /** @inheritdoc */
  async deleteSwipes(eventId, fromAttendeeId, { action } = {}) {
    const filter = [{ term: { eventId: this.scope(eventId) } }, { term: { initiatorId: fromAttendeeId } }];
    if (action) filter.push({ term: { action } });
    const res = await this.esClient.deleteByQuery(
      this.index,
      { bool: { filter, must_not: [{ term: { mutual: true } }] } },
      { refresh: this.refresh !== "false" }
    );
    return res.deleted;
  }

  scope(eventId) {
    const scoped = eventId || this.defaultEventId;
    if (!scoped) throw new Error("ElasticsearchInteractionRepository requires an eventId (or a defaultEventId)");
    return scoped;
  }
}

/** Deterministic document id for one attendee's swipe on another within an event. */
export function swipeDocId(eventId, fromAttendeeId, toAttendeeId) {
  return `${eventId}|${fromAttendeeId}|${toAttendeeId}`;
}
