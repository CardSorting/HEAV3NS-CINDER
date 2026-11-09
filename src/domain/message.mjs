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
    metadata = {}
  }) {
    if (!id || !podId || !content) {
      throw new Error("Message requires id, podId, and content");
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
      metadata: this.metadata
    };
  }
}

