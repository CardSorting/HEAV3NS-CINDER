/** [LAYER: INFRASTRUCTURE] */

import { IAttendeeRepository } from "../domain/interfaces/IAttendeeRepository.mjs";

const MAX_PER_EVENT = 1000;
// Never sent back to the app: searchText is pipeline-internal and vectors are large.
const SOURCE_EXCLUDES = Object.freeze(["searchText", "embedding"]);

/**
 * Elasticsearch-backed IAttendeeRepository over `cinder-registrations` (one document per attendee per event).
 *
 * - Writes: adds eventId / personId / role, drops the app's 32-dim hashed `embedding` and any stale
 *   `searchText`, so the index's default pipeline (cinder-embed-registration) re-embeds every save with
 *   the 1024-dim model.
 * - Reads: every query is filtered by event: the caller's eventId, else `defaultEventId`.
 * - Entities are built by an injected `toEntity` factory (composition root passes `(p) => new Attendee(p)`).
 */
export class ElasticsearchAttendeeRepository extends IAttendeeRepository {
  /**
   * @param {Object} deps
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} deps.esClient
   * @param {string} deps.index - e.g. "cinder-registrations"
   * @param {string|null} [deps.defaultEventId=null] - event used when a call does not name one
   * @param {(props: Object) => any} [deps.toEntity] - entity factory; defaults to plain props
   * @param {"true"|"false"|"wait_for"} [deps.refresh="false"] - refresh policy for writes
   */
  constructor({ esClient, index, defaultEventId = null, toEntity = (props) => props, refresh = "false" }) {
    super();
    if (!esClient) throw new Error("ElasticsearchAttendeeRepository requires esClient");
    if (!index) throw new Error("ElasticsearchAttendeeRepository requires an index name");
    this.esClient = esClient;
    this.index = index;
    this.defaultEventId = defaultEventId;
    this.toEntity = toEntity;
    this.refresh = refresh;
  }

  /**
   * Saves (creates or fully replaces) an attendee registration.
   * @param {import("../domain/attendee.mjs").Attendee | Object} attendee
   */
  async save(attendee) {
    const doc = toRegistrationDoc(attendee, this.defaultEventId);
    await this.esClient.index(this.index, doc, { id: doc.id, refresh: this.refresh });
  }

  /**
   * @param {string} id
   * @param {Object} [options]
   * @param {string} [options.eventId] - also require the registration to belong to this event
   * @param {boolean} [options.includeVectors=false] - load the stored 1024-dim profile vector
   */
  async findById(id, { eventId, includeVectors = false } = {}) {
    if (!id) return null;
    const doc = await this.esClient.get(this.index, id, { includeVectors });
    if (!doc) return null;
    const scope = eventId || null;
    if (scope && doc.eventId !== scope) return null;
    return this.toEntity(fromRegistrationDoc(doc, includeVectors));
  }

  /**
   * Lists the registrations of one event (never the whole index).
   * @param {string} [eventId] - defaults to `defaultEventId`
   */
  async listAll(eventId) {
    const scope = eventId || this.defaultEventId;
    if (!scope) throw new Error("ElasticsearchAttendeeRepository.listAll requires an eventId (or a defaultEventId)");
    const res = await this.esClient.search(this.index, {
      size: MAX_PER_EVENT,
      _source: { excludes: [...SOURCE_EXCLUDES] },
      query: { bool: { filter: [{ term: { eventId: scope } }] } },
      sort: [{ "name.keyword": "asc" }]
    });
    return res.hits.map((h) => this.toEntity(fromRegistrationDoc(h.source, false)));
  }
}

/**
 * Attendee (entity or JSON) -> cinder-registrations document.
 * @param {Object} attendee
 * @param {string|null} defaultEventId
 */
export function toRegistrationDoc(attendee, defaultEventId = null) {
  const json = typeof attendee?.toJSON === "function" ? attendee.toJSON() : { ...attendee };
  const { embedding: _hashedEmbedding, searchText: _stale, ...rest } = json;
  const eventId = rest.eventId || defaultEventId;
  if (!rest.id) throw new Error("Attendee registration requires an id");
  if (!eventId) throw new Error(`Attendee ${rest.id} has no eventId and no default event is configured`);
  return {
    ...rest,
    eventId,
    personId: rest.personId || rest.id,
    role: rest.role || "attendee"
  };
}

/** cinder-registrations document -> Attendee constructor props (plus registration extras). */
export function fromRegistrationDoc(doc, includeVectors) {
  const { searchText: _searchText, embedding, ...rest } = doc;
  return { ...rest, embedding: includeVectors && Array.isArray(embedding) ? embedding : [] };
}
