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
   * @param {string|null} [props.eventId=null] - Event (eventapp @id) the pod was formed at
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
    createdAt = new Date().toISOString(),
    eventId = null
  }) {
    if (!id || !name || !topic) {
      throw new Error("Pod requires valid id, name, and topic");
    }
    if (eventId !== null && (typeof eventId !== "string" || eventId.trim() === "")) {
      throw new Error("Pod eventId must be a non-empty string or null");
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
    this.eventId = eventId;
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
    if (this.eventId) {
      if (message.eventId === null) {
        message.eventId = this.eventId;
      } else if (message.eventId !== this.eventId) {
        throw new Error(`Message ${message.id} belongs to event ${message.eventId}, not this pod's event ${this.eventId}`);
      }
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
  /**
   * @param {string} location - display name of the meeting place
   * @param {string} time - display time, e.g. "12:15 PM"
   * @param {boolean} [confirmed=true]
   * @param {Object} [details]
   * @param {string|null} [details.spaceId] - cinder-spaces id of the place, when resolved
   * @param {string|null} [details.startsAt] - absolute ISO start, when resolved against the agenda
   */
  pinMeetup(location, time, confirmed = true, { spaceId = null, startsAt = null } = {}) {
    this.pinnedMeetup = {
      location,
      time,
      confirmed
    };
    if (spaceId) this.pinnedMeetup.spaceId = spaceId;
    if (startsAt) this.pinnedMeetup.startsAt = startsAt;
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
      createdAt: this.createdAt,
      eventId: this.eventId
    };
  }
}

