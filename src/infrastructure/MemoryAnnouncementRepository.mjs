/** [LAYER: INFRASTRUCTURE] */

import { IAnnouncementRepository } from "../domain/interfaces/IAnnouncementRepository.mjs";

/** Offline IAnnouncementRepository (the seed data has no announcements; tests may pass some in). */
export class MemoryAnnouncementRepository extends IAnnouncementRepository {
  /**
   * @param {Object} [deps]
   * @param {Object[]} [deps.announcements] - Announcement props
   * @param {(props: Object) => any} [deps.toEntity]
   */
  constructor({ announcements = [], toEntity = (props) => props } = {}) {
    super();
    this.announcements = announcements.map((a) => ({ ...a }));
    this.toEntity = toEntity;
  }

  /** @inheritdoc */
  async listByEvent(eventId, { publishedBeforeMs } = {}) {
    return this.select(eventId, publishedBeforeMs, () => true);
  }

  /** @inheritdoc */
  async listAffecting(eventId, { sessionIds = [], spaceIds = [] } = {}, publishedBeforeMs) {
    return this.select(eventId, publishedBeforeMs, (a) =>
      sessionIds.some((id) => a.affects?.sessionIds?.includes(id)) || spaceIds.some((id) => a.affects?.spaceIds?.includes(id)));
  }

  select(eventId, beforeMs, predicate) {
    return this.announcements
      .filter((a) => a.eventId === eventId && (beforeMs === undefined || Date.parse(a.publishAt) <= beforeMs) && predicate(a))
      .sort((a, b) => Date.parse(a.publishAt) - Date.parse(b.publishAt))
      .map((a) => this.toEntity(a));
  }
}
