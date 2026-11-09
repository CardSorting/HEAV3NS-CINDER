/** [LAYER: INFRASTRUCTURE] */

import { IAnnouncementRepository } from "../domain/interfaces/IAnnouncementRepository.mjs";

/**
 * Elasticsearch-backed IAnnouncementRepository over `cinder-announcements`.
 * Entities come from the injected `toEntity` (`(p) => new Announcement(p)`).
 */
export class ElasticsearchAnnouncementRepository extends IAnnouncementRepository {
  /**
   * @param {Object} deps
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} deps.esClient
   * @param {string} deps.index - e.g. "cinder-announcements"
   * @param {(props: Object) => any} [deps.toEntity]
   */
  constructor({ esClient, index, toEntity = (props) => props }) {
    super();
    if (!esClient) throw new Error("ElasticsearchAnnouncementRepository requires esClient");
    if (!index) throw new Error("ElasticsearchAnnouncementRepository requires an index name");
    this.esClient = esClient;
    this.index = index;
    this.toEntity = toEntity;
  }

  /** @inheritdoc */
  async listByEvent(eventId, { publishedBeforeMs } = {}) {
    const filter = [{ term: { eventId } }];
    if (publishedBeforeMs !== undefined) filter.push(publishedBefore(publishedBeforeMs));
    return this.query({ bool: { filter } });
  }

  /** @inheritdoc */
  async listAffecting(eventId, { sessionIds = [], spaceIds = [] } = {}, publishedBeforeMs) {
    if (!sessionIds.length && !spaceIds.length) return [];
    const should = [];
    if (sessionIds.length) should.push({ terms: { "affects.sessionIds": sessionIds } });
    if (spaceIds.length) should.push({ terms: { "affects.spaceIds": spaceIds } });
    const filter = [{ term: { eventId } }];
    if (publishedBeforeMs !== undefined) filter.push(publishedBefore(publishedBeforeMs));
    return this.query({ bool: { filter, should, minimum_should_match: 1 } });
  }

  async query(query) {
    const res = await this.esClient.search(this.index, { size: 200, query, sort: [{ publishAt: "asc" }] });
    return res.hits.map((h) => this.toEntity(h.source));
  }
}

function publishedBefore(ms) {
  return { range: { publishAt: { lte: ms, format: "epoch_millis" } } };
}
