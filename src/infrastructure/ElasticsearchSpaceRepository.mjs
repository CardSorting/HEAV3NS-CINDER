/** [LAYER: INFRASTRUCTURE] */

import { ISpaceRepository } from "../domain/interfaces/ISpaceRepository.mjs";

/**
 * Elasticsearch-backed ISpaceRepository over `cinder-spaces`.
 * An event's spaces are its physical venue's spaces (venueId = the eventapp location @id), or, for
 * online-only events, the virtual spaces stored with the event's own id. The venue is looked up in
 * the events index once per event and cached.
 */
export class ElasticsearchSpaceRepository extends ISpaceRepository {
  /**
   * @param {Object} deps
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} deps.esClient
   * @param {string} deps.index - e.g. "cinder-spaces"
   * @param {string} deps.eventsIndex - e.g. "eventapp"
   * @param {(props: Object) => any} [deps.toEntity] - `(p) => new VenueSpace(p)`
   */
  constructor({ esClient, index, eventsIndex, toEntity = (props) => props }) {
    super();
    if (!esClient) throw new Error("ElasticsearchSpaceRepository requires esClient");
    if (!index || !eventsIndex) throw new Error("ElasticsearchSpaceRepository requires index and eventsIndex");
    this.esClient = esClient;
    this.index = index;
    this.eventsIndex = eventsIndex;
    this.toEntity = toEntity;
    /** @type {Map<string, string|null>} eventId -> venue @id (null for online-only) */
    this.venueByEvent = new Map();
  }

  /** @inheritdoc */
  async listForEvent(eventId, { meetupFriendlyOnly = false } = {}) {
    const venueId = await this.venueOf(eventId);
    const filter = [venueId ? { term: { venueId } } : { term: { eventId } }];
    if (meetupFriendlyOnly) filter.push({ term: { meetupFriendly: true } });
    const res = await this.esClient.search(this.index, {
      size: 200, query: { bool: { filter } }, sort: [{ "name.keyword": "asc" }]
    });
    return res.hits.map((h) => this.toEntity(h.source));
  }

  /** @inheritdoc */
  async findById(spaceId) {
    if (!spaceId) return null;
    const doc = await this.esClient.get(this.index, spaceId);
    return doc ? this.toEntity(doc) : null;
  }

  async venueOf(eventId) {
    if (!this.venueByEvent.has(eventId)) {
      const ev = await this.esClient.get(this.eventsIndex, eventId);
      if (!ev) throw new Error(`Unknown event ${eventId}`);
      const place = (ev.location || []).find((l) => l && l["@type"] !== "VirtualLocation");
      this.venueByEvent.set(eventId, place?.["@id"] || null);
    }
    return this.venueByEvent.get(eventId);
  }
}
