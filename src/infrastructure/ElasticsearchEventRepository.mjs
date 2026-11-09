/** [LAYER: INFRASTRUCTURE] */

import { IEventRepository } from "../domain/interfaces/IEventRepository.mjs";

const DEFAULT_CATEGORIES = Object.freeze(["conference", "academic", "meetup", "expo"]);

// Only the fields a ConferenceEvent needs; eventapp docs also carry lineups, offers, sources…
const SOURCE_FIELDS = Object.freeze([
  "@id", "name", "category", "startDate", "endDate", "timezone", "eventStatus", "eventAttendanceMode",
  "description", "url", "labels", "location", "cinder"
]);

/**
 * Elasticsearch-backed IEventRepository over the `eventapp` index.
 *
 * Returns entities through an injected `toEntity` factory (the composition root passes
 * `(props) => new ConferenceEvent(props)`), so this adapter never imports concrete domain code.
 */
export class ElasticsearchEventRepository extends IEventRepository {
  /**
   * @param {Object} deps
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} deps.esClient
   * @param {string} deps.index - events index name, e.g. "eventapp"
   * @param {(props: Object) => any} [deps.toEntity] - entity factory; defaults to returning plain props
   */
  constructor({ esClient, index, toEntity = (props) => props }) {
    super();
    if (!esClient) throw new Error("ElasticsearchEventRepository requires esClient");
    if (!index) throw new Error("ElasticsearchEventRepository requires an index name");
    this.esClient = esClient;
    this.index = index;
    this.toEntity = toEntity;
  }

  /** @inheritdoc */
  async listSelectable({ categories = DEFAULT_CATEGORIES, from, to, limit = 50 } = {}) {
    const filter = [
      { term: { "cinder.enabled": true } },
      { terms: { category: [...categories] } }
    ];
    if (from) filter.push({ range: { endDate: { gte: from } } });
    if (to) filter.push({ range: { startDate: { lte: to } } });
    const res = await this.esClient.search(this.index, {
      size: limit,
      _source: [...SOURCE_FIELDS],
      query: { bool: { filter, must_not: [{ term: { eventStatus: "EventCancelled" } }] } },
      sort: [{ startDate: "asc" }, { "name.keyword": "asc" }]
    });
    return res.hits.map((h) => this.toEntity(eventappToProps(h.source)));
  }

  /** @inheritdoc */
  async findById(eventId) {
    if (!eventId) return null;
    const doc = await this.esClient.get(this.index, eventId);
    if (!doc || !DEFAULT_CATEGORIES.includes(doc.category)) return null;
    return this.toEntity(eventappToProps(doc));
  }
}

/**
 * Maps an eventapp (schema.org-style) document to ConferenceEvent constructor props.
 * @param {Object} doc
 */
export function eventappToProps(doc) {
  const place = (doc.location || []).find((l) => l && l["@type"] !== "VirtualLocation") || null;
  const venue = place
    ? {
        id: place["@id"] || null,
        name: place.name,
        city: place.address?.addressLocality || null,
        region: place.address?.addressRegion || null,
        country: place.address?.addressCountry || null,
        lat: place.geo?.latitude ?? null,
        lon: place.geo?.longitude ?? null
      }
    : null;
  return {
    id: doc["@id"],
    name: doc.name,
    category: doc.category,
    startDate: doc.startDate,
    endDate: doc.endDate,
    timezone: doc.timezone,
    status: doc.eventStatus || "EventScheduled",
    attendanceMode: doc.eventAttendanceMode || "OfflineEventAttendanceMode",
    description: doc.description || "",
    url: doc.url || "",
    labels: doc.labels || [],
    venue,
    cinder: doc.cinder || { enabled: false }
  };
}
