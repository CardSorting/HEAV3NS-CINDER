/** [LAYER: DOMAIN] */

import { Message } from "./message.mjs";

/**
 * Pure Domain Entity: Conference Pod.
 * The central social coordination layer of CINDER.
 * Zero I/O.
 */
export class Pod {
  /**
   * @param {Object} props
   * @param {string} props.id
   * @param {string} props.name
   * @param {string} props.topic
   * @param {string[]} [props.memberIds=[]]
   * @param {Message[]} [props.messages=[]]
   * @param {{ location: string, time: string, confirmed: boolean } | null} [props.pinnedMeetup=null]
   * @param {string[]} [props.pinnedAnnouncements=[]]
   * @param {string} [props.facilitatorName="CINDER Facilitator"]
   * @param {string} [props.createdAt]
   */
  constructor({
    id,
    name,
    topic,
    memberIds = [],
    messages = [],
    pinnedMeetup = null,
    pinnedAnnouncements = [],
    facilitatorName = "CINDER Facilitator (AI)",
    createdAt = new Date().toISOString()
  }) {
    if (!id || !name || !topic) {
      throw new Error("Pod requires valid id, name, and topic");
    }

    this.id = id;
    this.name = name;
    this.topic = topic;
    this.memberIds = [...memberIds];
    this.messages = messages.map((m) => (m instanceof Message ? m : new Message(m)));
    this.pinnedMeetup = pinnedMeetup ? { ...pinnedMeetup } : null;
    this.pinnedAnnouncements = [...pinnedAnnouncements];
    this.facilitatorName = facilitatorName;
    this.createdAt = createdAt;
  }

  /**
   * Adds an attendee to this Pod if not already present.
   * @param {string} attendeeId
   */
  addMember(attendeeId) {
    if (attendeeId && !this.memberIds.includes(attendeeId)) {
      this.memberIds.push(attendeeId);
    }
  }

  /**
   * Appends a message to the pod's persistent message log.
   * @param {Message} message
   */
  addMessage(message) {
    if (!(message instanceof Message)) {
      throw new Error("addMessage must be called with a Message entity");
    }
    this.messages.push(message);
    if (message.pinned) {
      this.pinnedAnnouncements.push(message.content);
    }
  }

  /**
   * Sets or updates the pinned meetup location and time.
   * @param {string} location
   * @param {string} time
   * @param {boolean} [confirmed=true]
   */
  pinMeetup(location, time, confirmed = true) {
    this.pinnedMeetup = {
      location,
      time,
      confirmed
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      topic: this.topic,
      memberIds: this.memberIds,
      messages: this.messages.map((m) => m.toJSON()),
      pinnedMeetup: this.pinnedMeetup,
      pinnedAnnouncements: this.pinnedAnnouncements,
      facilitatorName: this.facilitatorName,
      createdAt: this.createdAt
    };
  }
}
