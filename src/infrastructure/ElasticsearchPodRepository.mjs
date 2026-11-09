/** [LAYER: INFRASTRUCTURE] */

import { IPodRepository } from "../domain/interfaces/IPodRepository.mjs";

const MAX_PODS = 500;
const POD_FIELDS = Object.freeze([
  "id", "eventId", "name", "topic", "theme", "memberIds", "facilitatorName", "status",
  "pinnedMeetup", "pinnedAnnouncements", "createdAt", "updatedAt", "compositionMeta"
]);

/**
 * Elasticsearch-backed IPodRepository over `cinder-pods`.
 *
 * Pods are stored without their messages; messages go through an IMessageRepository
 * (cinder-messages, channel "pod"). `save()` writes the pod document and appends only messages not
 * persisted yet; loading a pod reattaches its messages, `compositionMeta` and centroid.
 * Entities are built by an injected `toEntity` factory (`(p) => new Pod(p)`).
 */
export class ElasticsearchPodRepository extends IPodRepository {
  /**
   * @param {Object} deps
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} deps.esClient
   * @param {string} deps.index - e.g. "cinder-pods"
   * @param {import("../domain/interfaces/IMessageRepository.mjs").IMessageRepository} deps.messageRepo
   * @param {string|null} [deps.defaultEventId=null]
   * @param {(props: Object) => any} [deps.toEntity]
   * @param {"true"|"false"|"wait_for"} [deps.refresh="true"]
   * @param {number} [deps.vectorDims=1024] - centroid dimensions accepted by the index mapping
   */
  constructor({ esClient, index, messageRepo, defaultEventId = null, toEntity = (props) => props, refresh = "true", vectorDims = 1024 }) {
    super();
    if (!esClient) throw new Error("ElasticsearchPodRepository requires esClient");
    if (!index) throw new Error("ElasticsearchPodRepository requires an index name");
    if (!messageRepo) throw new Error("ElasticsearchPodRepository requires messageRepo");
    this.esClient = esClient;
    this.index = index;
    this.messageRepo = messageRepo;
    this.defaultEventId = defaultEventId;
    this.toEntity = toEntity;
    this.refresh = refresh;
    this.vectorDims = vectorDims;
    /** @type {Map<string, Set<string>>} podId -> ids of messages already in cinder-messages */
    this.persistedMessageIds = new Map();
  }

  /** @inheritdoc */
  async save(pod) {
    const json = typeof pod?.toJSON === "function" ? pod.toJSON() : { ...pod };
    if (!json.id) throw new Error("Pod requires an id");
    const eventId = json.eventId || this.defaultEventId;
    if (!eventId) throw new Error(`Pod ${json.id} has no eventId and no default event is configured`);

    const doc = {};
    for (const key of POD_FIELDS) if (json[key] !== undefined && json[key] !== null) doc[key] = json[key];
    doc.eventId = eventId;
    doc.status = doc.status || "active";
    doc.updatedAt = new Date().toISOString();
    if (pod.compositionMeta) doc.compositionMeta = pod.compositionMeta;
    const centroid = pod.centroid || json.centroid;
    if (Array.isArray(centroid) && centroid.length === this.vectorDims) doc.centroid = centroid;

    await this.esClient.index(this.index, doc, { id: doc.id, refresh: this.refresh });

    const known = this.knownIds(doc.id);
    const pending = (pod.messages || json.messages || []).filter((m) => !known.has(m.id));
    for (const message of pending) {
      if (message.eventId === null || message.eventId === undefined) message.eventId = eventId;
      await this.messageRepo.appendPodMessage(message);
      known.add(message.id);
    }
  }

  /** @inheritdoc */
  async findById(podId) {
    if (!podId) return null;
    const doc = await this.esClient.get(this.index, podId, { includeVectors: true });
    return doc ? this.hydrate(doc) : null;
  }

  /** @inheritdoc */
  async findByMemberId(attendeeId) {
    const filter = [{ term: { memberIds: attendeeId } }, { term: { status: "active" } }];
    if (this.defaultEventId) filter.push({ term: { eventId: this.defaultEventId } });
    const res = await this.esClient.search(this.index, {
      size: 1, query: { bool: { filter } }, sort: [{ createdAt: "desc" }]
    }, { includeVectors: true });
    return res.hits[0] ? this.hydrate(res.hits[0].source) : null;
  }

  /** @inheritdoc */
  async listAll(eventId) {
    const scope = eventId || this.defaultEventId;
    if (!scope) throw new Error("ElasticsearchPodRepository.listAll requires an eventId (or a defaultEventId)");
    const res = await this.esClient.search(this.index, {
      size: MAX_PODS, query: { bool: { filter: [{ term: { eventId: scope } }] } }, sort: [{ createdAt: "asc" }]
    }, { includeVectors: true });
    return Promise.all(res.hits.map((h) => this.hydrate(h.source)));
  }

  async hydrate(doc) {
    const messages = await this.messageRepo.listPodMessages(doc.id);
    this.persistedMessageIds.set(doc.id, new Set(messages.map((m) => m.id)));
    const { centroid, compositionMeta, ...props } = doc;
    const entity = this.toEntity({ ...props, messages });
    if (entity && typeof entity === "object") {
      entity.compositionMeta = compositionMeta || null;
      entity.centroid = Array.isArray(centroid) ? centroid : null;
      if (props.status && entity.status === undefined) entity.status = props.status;
    }
    return entity;
  }

  knownIds(podId) {
    if (!this.persistedMessageIds.has(podId)) this.persistedMessageIds.set(podId, new Set());
    return this.persistedMessageIds.get(podId);
  }
}
