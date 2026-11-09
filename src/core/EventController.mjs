/** [LAYER: CORE] */

import { requestError } from "../plumbing/requestError.mjs";

/**
 * Use cases for choosing an event: list selectable events and resolve the active event of a request.
 * Everything else in CINDER (check-in, discovery, pods, agenda) is scoped by the resolved event's id.
 */
export class EventController {
  /**
   * @param {Object} deps
   * @param {import("../domain/interfaces/IEventRepository.mjs").IEventRepository} deps.eventRepo
   * @param {{ nowMs: () => number }} deps.clock - plumbing clock (real or demo time)
   * @param {string|null} [deps.defaultEventId=null] - used when a request names no event (demo event)
   * @param {number} [deps.cacheTtlMs=300000] - how long a resolved event is reused
   */
  constructor({ eventRepo, clock, defaultEventId = null, cacheTtlMs = 300000 }) {
    if (!eventRepo) throw new Error("EventController requires eventRepo");
    if (!clock) throw new Error("EventController requires clock");
    this.eventRepo = eventRepo;
    this.clock = clock;
    this.defaultEventId = defaultEventId;
    this.cacheTtlMs = cacheTtlMs;
    /** @type {Map<string, { event: any, at: number }>} */
    this.cache = new Map();
  }

  /**
   * Lists selectable events with their phase relative to the clock.
   * @param {Object} [filters]
   * @param {string[]} [filters.categories]
   * @param {string} [filters.from] - ISO date
   * @param {string} [filters.to] - ISO date
   * @param {number} [filters.limit]
   * @returns {Promise<Array<Object>>} event JSON plus `phase` and `isDefault`
   */
  async listEvents(filters = {}) {
    const events = await this.eventRepo.listSelectable(filters);
    const now = this.clock.nowMs();
    for (const ev of events) this.remember(ev);
    return events.map((ev) => ({ ...ev.toJSON(), phase: ev.phaseAt(now), isDefault: ev.id === this.defaultEventId }));
  }

  /**
   * Resolves the event a request runs against: the explicit id, else the default (demo) event.
   * @param {string|null|undefined} eventId
   * @returns {Promise<import("../domain/conferenceEvent.mjs").ConferenceEvent>}
   * @throws {Error} with `code` EVENT_REQUIRED (400) or EVENT_NOT_FOUND (404)
   */
  async resolveEvent(eventId) {
    const id = eventId || this.defaultEventId;
    if (!id) throw requestError("EVENT_REQUIRED", 400, "No event selected: pass eventId or configure CINDER_DEMO_EVENT_ID");

    const cached = this.cache.get(id);
    if (cached && Date.now() - cached.at < this.cacheTtlMs) return cached.event;

    const event = await this.eventRepo.findById(id);
    if (!event || !event.isSelectable()) {
      throw requestError("EVENT_NOT_FOUND", 404, `Event ${id} does not exist or has no CINDER data`);
    }
    this.remember(event);
    return event;
  }

  /**
   * Resolved event as JSON with its current phase (for /api/conferences/:id).
   * @param {string|null|undefined} eventId
   */
  async describeEvent(eventId) {
    const event = await this.resolveEvent(eventId);
    return { ...event.toJSON(), phase: event.phaseAt(this.clock.nowMs()), isDefault: event.id === this.defaultEventId };
  }

  remember(event) {
    if (event?.isSelectable?.()) this.cache.set(event.id, { event, at: Date.now() });
  }
}
