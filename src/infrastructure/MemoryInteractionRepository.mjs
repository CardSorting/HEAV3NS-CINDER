/** [LAYER: INFRASTRUCTURE] */

import { IInteractionRepository } from "../domain/interfaces/IInteractionRepository.mjs";

/** Offline IInteractionRepository with the same semantics as the Elasticsearch one (one record per directed swipe). */
export class MemoryInteractionRepository extends IInteractionRepository {
  /**
   * @param {Object} [deps]
   * @param {string|null} [deps.defaultEventId=null]
   * @param {(props: Object) => any} [deps.toEntity]
   */
  constructor({ defaultEventId = null, toEntity = (props) => props } = {}) {
    super();
    this.defaultEventId = defaultEventId;
    this.toEntity = toEntity;
    /** @type {Map<string, Object>} */
    this.swipes = new Map();
  }

  /** @inheritdoc */
  async saveSwipe(swipe) {
    const json = typeof swipe?.toJSON === "function" ? swipe.toJSON() : { ...swipe };
    const eventId = this.scope(json.eventId);
    this.swipes.set(key(eventId, json.initiatorId, json.targetId), { ...json, eventId, mutual: Boolean(json.mutual) });
  }

  /** @inheritdoc */
  async findSwipe(eventId, from, to) {
    const s = this.swipes.get(key(this.scope(eventId), from, to));
    return s ? this.toEntity(s) : null;
  }

  /** @inheritdoc */
  async listSwipedIds(eventId, from, { action } = {}) {
    return this.all(eventId).filter((s) => s.initiatorId === from && (!action || s.action === action)).map((s) => s.targetId);
  }

  /** @inheritdoc */
  async listMutualMatches(eventId, attendeeId) {
    return this.all(eventId)
      .filter((s) => s.mutual && (s.initiatorId === attendeeId || s.targetId === attendeeId))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((s) => this.toEntity(s));
  }

  /** @inheritdoc */
  async findMatchById(matchId) {
    const s = [...this.swipes.values()].find((x) => x.mutual && x.id === matchId);
    return s ? this.toEntity(s) : null;
  }

  /** @inheritdoc */
  async deleteSwipes(eventId, from, { action } = {}) {
    let deleted = 0;
    const scope = this.scope(eventId);
    for (const [k, s] of this.swipes) {
      if (s.eventId === scope && s.initiatorId === from && !s.mutual && (!action || s.action === action)) {
        this.swipes.delete(k);
        deleted++;
      }
    }
    return deleted;
  }

  all(eventId) {
    const scope = this.scope(eventId);
    return [...this.swipes.values()].filter((s) => s.eventId === scope);
  }

  scope(eventId) {
    const scoped = eventId || this.defaultEventId;
    if (!scoped) throw new Error("MemoryInteractionRepository requires an eventId (or a defaultEventId)");
    return scoped;
  }
}

const key = (eventId, from, to) => `${eventId}|${from}|${to}`;
