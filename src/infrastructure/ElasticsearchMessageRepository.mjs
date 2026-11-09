/** [LAYER: INFRASTRUCTURE] */

import { IMessageRepository } from "../domain/interfaces/IMessageRepository.mjs";

const DEFAULT_LIMIT = 200;

/**
 * Elasticsearch-backed IMessageRepository over `cinder-messages`.
 *
 * - Pod chat: `channel: "pod"` + `podId`; returned as entities via the injected `toEntity` factory
 *   (the composition root passes `(p) => new Message(p)`).
 * - 1:1 messages between mutual matches: `channel: "direct"` + `matchId`; returned as plain objects.
 *
 * Writes refresh immediately (default "true") so a sent message shows up on the next read.
 * Lists return the newest `limit` messages in chronological order.
 */
export class ElasticsearchMessageRepository extends IMessageRepository {
  /**
   * @param {Object} deps
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} deps.esClient
   * @param {string} deps.index - e.g. "cinder-messages"
   * @param {string|null} [deps.defaultEventId=null] - event used when a message does not carry one
   * @param {(props: Object) => any} [deps.toEntity] - pod message factory
   * @param {"true"|"false"|"wait_for"} [deps.refresh="true"]
   */
  constructor({ esClient, index, defaultEventId = null, toEntity = (props) => props, refresh = "true" }) {
    super();
    if (!esClient) throw new Error("ElasticsearchMessageRepository requires esClient");
    if (!index) throw new Error("ElasticsearchMessageRepository requires an index name");
    this.esClient = esClient;
    this.index = index;
    this.defaultEventId = defaultEventId;
    this.toEntity = toEntity;
    this.refresh = refresh;
  }

  /** @inheritdoc */
  async appendPodMessage(message) {
    const json = typeof message?.toJSON === "function" ? message.toJSON() : { ...message };
    if (!json.id || !json.podId) throw new Error("appendPodMessage requires id and podId");
    const doc = { ...json, eventId: this.scope(json.eventId), channel: "pod" };
    delete doc.matchId;
    await this.esClient.index(this.index, doc, { id: doc.id, refresh: this.refresh });
  }

  /** @inheritdoc */
  async listPodMessages(podId, { limit = DEFAULT_LIMIT } = {}) {
    const hits = await this.latest([{ term: { channel: "pod" } }, { term: { podId } }], limit);
    return hits.map((doc) => {
      const { channel: _channel, matchId: _matchId, ...props } = doc;
      return this.toEntity(props);
    });
  }

  /** @inheritdoc */
  async appendDirectMessage(message) {
    if (!message?.id || !message.matchId || !message.content) {
      throw new Error("appendDirectMessage requires id, matchId and content");
    }
    const doc = {
      id: message.id,
      eventId: this.scope(message.eventId),
      channel: "direct",
      matchId: message.matchId,
      senderId: message.senderId,
      senderName: message.senderName || "Attendee",
      senderType: message.senderType || "attendee",
      content: message.content,
      timestamp: message.timestamp || new Date().toISOString(),
      pinned: false
    };
    await this.esClient.index(this.index, doc, { id: doc.id, refresh: this.refresh });
  }

  /** @inheritdoc */
  async listDirectMessages(matchId, { limit = DEFAULT_LIMIT } = {}) {
    const hits = await this.latest([{ term: { channel: "direct" } }, { term: { matchId } }], limit);
    return hits.map(({ id, eventId, matchId: mid, senderId, senderName, content, timestamp }) => ({
      id, eventId, matchId: mid, senderId, senderName, content, timestamp
    }));
  }

  /** Newest `limit` documents matching the filter, returned oldest-first. */
  async latest(filter, limit) {
    const res = await this.esClient.search(this.index, {
      size: limit,
      query: { bool: { filter } },
      sort: [{ timestamp: "desc" }, { id: "desc" }]
    });
    return res.hits.map((h) => h.source).reverse();
  }

  scope(eventId) {
    const scoped = eventId || this.defaultEventId;
    if (!scoped) throw new Error("ElasticsearchMessageRepository requires an eventId (or a defaultEventId)");
    return scoped;
  }
}
