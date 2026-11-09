/** [LAYER: DOMAIN] */

/**
 * Pure Domain Entity: Pod Message.
 * Zero I/O.
 */
export class Message {
  /**
   * @param {Object} props
   * @param {string} props.id
   * @param {string} props.podId
   * @param {string} props.senderId
   * @param {string} props.senderName
   * @param {"attendee" | "facilitator" | "system"} [props.senderType="attendee"]
   * @param {string} props.content
   * @param {string} [props.timestamp]
   * @param {boolean} [props.pinned=false]
   * @param {Record<string, any>} [props.metadata={}]
   * @param {string|null} [props.eventId=null] - Event the pod (and so the message) belongs to
   */
  constructor({
    id,
    podId,
    senderId,
    senderName,
    senderType = "attendee",
    content,
    timestamp = new Date().toISOString(),
    pinned = false,
    metadata = {},
    eventId = null
  }) {
    if (!id || !podId || !content) {
      throw new Error("Message requires id, podId, and content");
    }
    if (eventId !== null && (typeof eventId !== "string" || eventId.trim() === "")) {
      throw new Error("Message eventId must be a non-empty string or null");
    }

    this.id = id;
    this.podId = podId;
    this.senderId = senderId;
    this.senderName = senderName;
    this.senderType = senderType;
    this.content = content;
    this.timestamp = timestamp;
    this.pinned = Boolean(pinned);
    this.metadata = metadata ? { ...metadata } : {};
    this.eventId = eventId;
  }

  toJSON() {
    return {
      id: this.id,
      podId: this.podId,
      senderId: this.senderId,
      senderName: this.senderName,
      senderType: this.senderType,
      content: this.content,
      timestamp: this.timestamp,
      pinned: this.pinned,
      metadata: this.metadata,
      eventId: this.eventId
    };
  }
}

