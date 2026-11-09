/** [LAYER: DOMAIN] */

/**
 * Pure Domain Entity: Swipe Match / Connection.
 * Zero I/O.
 */
export class Match {
  /**
   * @param {Object} props
   * @param {string} props.id
   * @param {string} props.initiatorId
   * @param {string} props.targetId
   * @param {"like" | "pass"} props.action
   * @param {boolean} [props.mutual=false]
   * @param {string} [props.explanation=""]
   * @param {string} [props.createdAt]
   * @param {string|null} [props.eventId=null] - Event both attendees are registered for
   */
  constructor({
    id,
    initiatorId,
    targetId,
    action,
    mutual = false,
    explanation = "",
    createdAt = new Date().toISOString(),
    eventId = null
  }) {
    if (!id || !initiatorId || !targetId || !action) {
      throw new Error("Match requires id, initiatorId, targetId, and action");
    }
    if (eventId !== null && (typeof eventId !== "string" || eventId.trim() === "")) {
      throw new Error("Match eventId must be a non-empty string or null");
    }

    this.id = id;
    this.initiatorId = initiatorId;
    this.targetId = targetId;
    this.action = action;
    this.mutual = Boolean(mutual);
    this.explanation = explanation;
    this.createdAt = createdAt;
    this.eventId = eventId;
  }

  toJSON() {
    return {
      id: this.id,
      initiatorId: this.initiatorId,
      targetId: this.targetId,
      action: this.action,
      mutual: this.mutual,
      explanation: this.explanation,
      createdAt: this.createdAt,
      eventId: this.eventId
    };
  }
}

