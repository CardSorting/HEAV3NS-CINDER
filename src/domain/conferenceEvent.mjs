/** [LAYER: DOMAIN] */

/**
 * Pure Domain Entity: a selectable event (conference, academic conference, meetup or expo).
 * Everything CINDER stores (registrations, sessions, pods, messages…) is scoped by its `id`.
 * Zero I/O.
 */

export const SELECTABLE_CATEGORIES = Object.freeze(["conference", "academic", "meetup", "expo"]);

export class ConferenceEvent {
  /**
   * @param {Object} props
   * @param {string} props.id - eventapp `@id`, e.g. "urn:ue:event:devsummit-2026"
   * @param {string} props.name
   * @param {string} props.category - one of SELECTABLE_CATEGORIES
   * @param {string} props.startDate - ISO-8601 with offset
   * @param {string} props.endDate - ISO-8601 with offset
   * @param {string} props.timezone - IANA timezone, e.g. "America/Denver"
   * @param {string} [props.status="EventScheduled"] - schema.org EventStatusType name
   * @param {string} [props.attendanceMode="OfflineEventAttendanceMode"]
   * @param {string} [props.description=""]
   * @param {string} [props.url=""]
   * @param {string[]} [props.labels=[]]
   * @param {{ id: string, name: string, city?: string, region?: string|null, country?: string, lat?: number, lon?: number } | null} [props.venue=null]
   * @param {{ enabled: boolean, registrations?: number, sessions?: number, speakers?: number, announcements?: number }} [props.cinder]
   */
  constructor({
    id,
    name,
    category,
    startDate,
    endDate,
    timezone,
    status = "EventScheduled",
    attendanceMode = "OfflineEventAttendanceMode",
    description = "",
    url = "",
    labels = [],
    venue = null,
    cinder = { enabled: false }
  }) {
    if (!id || typeof id !== "string") throw new Error("ConferenceEvent requires a string id");
    if (!name || typeof name !== "string") throw new Error("ConferenceEvent requires a name");
    if (!SELECTABLE_CATEGORIES.includes(category)) {
      throw new Error(`ConferenceEvent category must be one of ${SELECTABLE_CATEGORIES.join(", ")} (got ${category})`);
    }
    if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
      throw new Error("ConferenceEvent requires valid ISO startDate and endDate");
    }
    if (Date.parse(endDate) < Date.parse(startDate)) {
      throw new Error("ConferenceEvent endDate must not be before startDate");
    }
    if (!timezone || typeof timezone !== "string") throw new Error("ConferenceEvent requires an IANA timezone");

    this.id = id;
    this.name = name;
    this.category = category;
    this.startDate = startDate;
    this.endDate = endDate;
    this.timezone = timezone;
    this.status = status;
    this.attendanceMode = attendanceMode;
    this.description = description;
    this.url = url;
    this.labels = Array.isArray(labels) ? [...labels] : [];
    this.venue = venue ? { ...venue } : null;
    this.cinder = {
      enabled: Boolean(cinder?.enabled),
      registrations: cinder?.registrations ?? 0,
      sessions: cinder?.sessions ?? 0,
      speakers: cinder?.speakers ?? 0,
      announcements: cinder?.announcements ?? 0
    };
  }

  /** CINDER data exists for the event and it has not been cancelled. */
  isSelectable() {
    return this.cinder.enabled && this.status !== "EventCancelled";
  }

  /** Attendees join only online (no physical venue). */
  isOnlineOnly() {
    return this.attendanceMode === "OnlineEventAttendanceMode";
  }

  /**
   * @param {number} nowMs - from the plumbing clock
   * @returns {"upcoming"|"in-progress"|"past"}
   */
  phaseAt(nowMs) {
    if (nowMs < Date.parse(this.startDate)) return "upcoming";
    if (nowMs > Date.parse(this.endDate)) return "past";
    return "in-progress";
  }

  /** Number of calendar days the event spans in its own timezone. */
  durationDays() {
    const day = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: this.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
    return Math.round((Date.parse(day(this.endDate)) - Date.parse(day(this.startDate))) / 86400000) + 1;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      startDate: this.startDate,
      endDate: this.endDate,
      timezone: this.timezone,
      status: this.status,
      attendanceMode: this.attendanceMode,
      description: this.description,
      url: this.url,
      labels: this.labels,
      venue: this.venue,
      cinder: this.cinder
    };
  }
}
