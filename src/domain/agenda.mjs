/** [LAYER: DOMAIN] */

import { SOCIAL_SESSION_TYPES } from "../plumbing/sessionTypes.mjs";

export { SOCIAL_SESSION_TYPES };

/**
 * Pure Domain Entity: Conference Agenda Session.
 * `startTime`/`endTime` are local "HH:MM" display strings; `startDate`/`endDate` (when present) are the
 * absolute ISO-8601 instants with offset, which all time comparisons should use.
 * Zero I/O.
 */
export class Session {
  /**
   * @param {Object} props
   * @param {string} props.id
   * @param {string} props.title
   * @param {string[]} [props.speakers=[]]
   * @param {string} props.startTime - local display time, e.g. "12:15"
   * @param {string} props.endTime - local display time
   * @param {string} props.room
   * @param {string} [props.track=""]
   * @param {string} [props.description=""]
   * @param {string|null} [props.startDate=null] - absolute start, ISO-8601 with offset
   * @param {string|null} [props.endDate=null] - absolute end, ISO-8601 with offset
   * @param {string|null} [props.timezone=null] - IANA timezone of the event
   * @param {string|null} [props.sessionType=null] - e.g. "talk", "keynote", "workshop", "lunch", "break"
   * @param {string|null} [props.spaceId=null] - cinder-spaces id of the room
   */
  constructor({
    id,
    title,
    speakers = [],
    startTime,
    endTime,
    room,
    track = "",
    description = "",
    startDate = null,
    endDate = null,
    timezone = null,
    sessionType = null,
    spaceId = null
  }) {
    if (!id || !title || !startTime || !endTime || !room) {
      throw new Error("Session requires id, title, startTime, endTime, and room");
    }
    if ((startDate === null) !== (endDate === null)) {
      throw new Error("Session startDate and endDate must be provided together");
    }
    if (startDate !== null) {
      if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
        throw new Error("Session startDate and endDate must be valid ISO-8601 instants");
      }
      if (Date.parse(endDate) < Date.parse(startDate)) {
        throw new Error("Session endDate must not be before startDate");
      }
    }

    this.id = id;
    this.title = title;
    this.speakers = [...speakers];
    this.startTime = startTime;
    this.endTime = endTime;
    this.room = room;
    this.track = track;
    this.description = description;
    this.startDate = startDate;
    this.endDate = endDate;
    this.timezone = timezone;
    this.sessionType = sessionType;
    this.spaceId = spaceId;
  }

  /** @returns {number|null} absolute start in epoch ms, or null for seed sessions without a date */
  startsAtMs() {
    return this.startDate ? Date.parse(this.startDate) : null;
  }

  /** @returns {number|null} absolute end in epoch ms */
  endsAtMs() {
    return this.endDate ? Date.parse(this.endDate) : null;
  }

  /** True for breaks, lunch and networking slots: times when pods can meet in person. */
  isSocialSlot() {
    return SOCIAL_SESSION_TYPES.includes(this.sessionType);
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      speakers: this.speakers,
      startTime: this.startTime,
      endTime: this.endTime,
      room: this.room,
      track: this.track,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
      timezone: this.timezone,
      sessionType: this.sessionType,
      spaceId: this.spaceId
    };
  }
}
