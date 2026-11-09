/** [LAYER: INFRASTRUCTURE] */

import { IEventRepository } from "../domain/interfaces/IEventRepository.mjs";
import { SEED_EVENT } from "../plumbing/conferenceSeedData.mjs";

/** Offline IEventRepository serving the bundled seed event (and any events passed in). */
export class MemoryEventRepository extends IEventRepository {
  /**
   * @param {Object} [deps]
   * @param {Object[]} [deps.events] - ConferenceEvent props; defaults to the seed event
   * @param {(props: Object) => any} [deps.toEntity]
   */
  constructor({ events = [SEED_EVENT], toEntity = (props) => props } = {}) {
    super();
    this.toEntity = toEntity;
    this.events = events.map((e) => ({ ...e }));
  }

  /** @inheritdoc */
  async listSelectable({ categories, from, to, limit = 50 } = {}) {
    return this.events
      .filter((e) => e.cinder?.enabled && e.status !== "EventCancelled")
      .filter((e) => !categories || categories.includes(e.category))
      .filter((e) => !from || Date.parse(e.endDate) >= Date.parse(from))
      .filter((e) => !to || Date.parse(e.startDate) <= Date.parse(to))
      .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate))
      .slice(0, limit)
      .map((e) => this.toEntity(e));
  }

  /** @inheritdoc */
  async findById(eventId) {
    const e = this.events.find((x) => x.id === eventId);
    return e ? this.toEntity(e) : null;
  }
}
