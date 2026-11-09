/** [LAYER: DOMAIN] */

/**
 * Pure Domain Entity: a conference-wide announcement (matches the cinder-announcements index).
 * Zero I/O.
 */

export const ANNOUNCEMENT_KINDS = Object.freeze(["general", "logistics", "reminder", "room-change", "schedule-change"]);
export const ANNOUNCEMENT_SEVERITIES = Object.freeze(["info", "important", "critical"]);

export class Announcement {
  /**
   * @param {Object} props
   * @param {string} props.id
   * @param {string} props.eventId - eventapp @id
   * @param {string} props.publishAt - ISO-8601 instant when it becomes visible
   * @param {string} props.title
   * @param {string} [props.body=""]
   * @param {string} [props.kind="general"] - one of ANNOUNCEMENT_KINDS
   * @param {string} [props.severity="info"] - one of ANNOUNCEMENT_SEVERITIES
   * @param {string} [props.audience="all"] - "all", a track name, or a pod id
   * @param {{ sessionIds?: string[], spaceIds?: string[] }} [props.affects]
   */
  constructor({
    id,
    eventId,
    publishAt,
    title,
    body = "",
    kind = "general",
    severity = "info",
    audience = "all",
    affects = {}
  }) {
    if (!id || typeof id !== "string") throw new Error("Announcement requires a string id");
    if (!eventId || typeof eventId !== "string") throw new Error("Announcement requires an eventId");
    if (!title || typeof title !== "string") throw new Error("Announcement requires a title");
    if (Number.isNaN(Date.parse(publishAt))) throw new Error("Announcement publishAt must be a valid ISO-8601 instant");
    if (!ANNOUNCEMENT_KINDS.includes(kind)) throw new Error(`Announcement kind must be one of ${ANNOUNCEMENT_KINDS.join(", ")}`);
    if (!ANNOUNCEMENT_SEVERITIES.includes(severity)) {
      throw new Error(`Announcement severity must be one of ${ANNOUNCEMENT_SEVERITIES.join(", ")}`);
    }

    this.id = id;
    this.eventId = eventId;
    this.publishAt = publishAt;
    this.title = title;
    this.body = body;
    this.kind = kind;
    this.severity = severity;
    this.audience = audience;
    this.affects = {
      sessionIds: [...(affects?.sessionIds || [])],
      spaceIds: [...(affects?.spaceIds || [])]
    };
  }

  /** @param {number} nowMs - from the plumbing clock */
  isPublishedAt(nowMs) {
    return Date.parse(this.publishAt) <= nowMs;
  }

  /**
   * True when the announcement concerns any of the given sessions or spaces, e.g. a pod's
   * bookmarked sessions or its pinned meetup spot.
   * @param {{ sessionIds?: string[], spaceIds?: string[] }} refs
   */
  affectsAny({ sessionIds = [], spaceIds = [] } = {}) {
    return sessionIds.some((id) => this.affects.sessionIds.includes(id))
      || spaceIds.some((id) => this.affects.spaceIds.includes(id));
  }

  /** Announcements that change where or when something happens. */
  isScheduleChange() {
    return this.kind === "room-change" || this.kind === "schedule-change";
  }

  toJSON() {
    return {
      id: this.id,
      eventId: this.eventId,
      publishAt: this.publishAt,
      title: this.title,
      body: this.body,
      kind: this.kind,
      severity: this.severity,
      audience: this.audience,
      affects: this.affects
    };
  }
}
