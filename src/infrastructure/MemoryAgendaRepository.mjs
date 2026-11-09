/** [LAYER: INFRASTRUCTURE] */

import { IAgendaRepository } from "../domain/interfaces/IAgendaRepository.mjs";
import { SEED_CONFERENCE_AGENDA, SEED_EVENT } from "../plumbing/conferenceSeedData.mjs";
import { SOCIAL_SESSION_TYPES, CONTENT_SESSION_TYPES } from "../plumbing/sessionTypes.mjs";
import { cosineSimilarity } from "../plumbing/vectorMath.mjs";

/**
 * Offline IAgendaRepository: the seed agenda placed on the seed event's day with absolute times.
 * `findRelevant` ranks by cosine similarity when sessions carry vectors, else returns upcoming content.
 */
export class MemoryAgendaRepository extends IAgendaRepository {
  /**
   * @param {Object} [deps]
   * @param {Object[]} [deps.sessions] - Session props with eventId; defaults to the seed agenda
   * @param {(props: Object) => any} [deps.toEntity]
   */
  constructor({ sessions = seedSessions(), toEntity = (props) => props } = {}) {
    super();
    this.sessions = sessions.map((s) => ({ ...s }));
    this.toEntity = toEntity;
  }

  /** @inheritdoc */
  async listByEvent(eventId) {
    return this.forEvent(eventId).map((s) => this.entity(s));
  }

  /** @inheritdoc */
  async findById(sessionId) {
    const s = this.sessions.find((x) => x.id === sessionId);
    return s ? this.entity(s) : null;
  }

  /** @inheritdoc */
  async findNextSocialSlot(eventId, afterMs) {
    const s = this.forEvent(eventId).find((x) => SOCIAL_SESSION_TYPES.includes(x.sessionType) && Date.parse(x.startDate) >= afterMs);
    return s ? this.entity(s) : null;
  }

  /** @inheritdoc */
  async findRelevant(eventId, vector, { sessionTypes = CONTENT_SESSION_TYPES, afterMs, limit = 3 } = {}) {
    return this.forEvent(eventId)
      .filter((s) => sessionTypes.includes(s.sessionType))
      .filter((s) => afterMs === undefined || Date.parse(s.startDate) >= afterMs)
      .map((s) => ({ s, score: Array.isArray(s.embedding) && vector?.length === s.embedding.length ? cosineSimilarity(vector, s.embedding) : 0 }))
      .sort((a, b) => b.score - a.score || Date.parse(a.s.startDate) - Date.parse(b.s.startDate))
      .slice(0, limit)
      .map(({ s }) => this.entity(s));
  }

  forEvent(eventId) {
    return this.sessions.filter((s) => s.eventId === eventId).sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
  }

  entity(s) {
    const { eventId: _eventId, embedding: _embedding, ...props } = s;
    return this.toEntity(props);
  }
}

/** Seed agenda -> Session props on the seed event's day (absolute times with the event's UTC offset). */
export function seedSessions(event = SEED_EVENT, agenda = SEED_CONFERENCE_AGENDA) {
  const day = event.startDate.slice(0, 10);
  const at = (hhmm) => `${day}T${hhmm}:00${event.utcOffset}`;
  return agenda.map((s) => ({
    ...s,
    speakers: [...s.speakers],
    eventId: event.id,
    startDate: at(s.startTime),
    endDate: at(s.endTime),
    timezone: event.timezone,
    sessionType: /networking|lunch|meetup/i.test(s.title) ? "lunch" : /keynote/i.test(s.title) ? "keynote" : "talk",
    spaceId: null
  }));
}
